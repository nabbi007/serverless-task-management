const { v4: uuidv4 } = require('uuid');
const { putItem, batchPutItems } = require('../utils/dynamodb');
const { getUserFromEvent, requireAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { validateEnvVars, validateRequiredFields, validatePriority, sanitizeString } = require('../utils/validation');
const { createLogger } = require('../utils/logger');
const { CognitoIdentityProviderClient, ListUsersCommand, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE', 'USER_POOL_ID']);

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-west-1' });

const getUserByEmail = async (email) => {
  if (!email) return null;

  const command = new ListUsersCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Filter: `email = "${email}"`
  });

  const response = await cognitoClient.send(command);
  const user = response.Users?.[0];
  if (!user) return null;
  const attributes = user.Attributes || [];
  const name = attributes.find(attr => attr.Name === 'name')?.Value || null;
  return {
    userId: user.Username,
    enabled: user.Enabled !== false,
    status: user.UserStatus,
    email,
    name
  };
};

const getUserById = async (userId) => {
  if (!userId) return null;

  const command = new AdminGetUserCommand({
    UserPoolId: process.env.USER_POOL_ID,
    Username: userId
  });

  const response = await cognitoClient.send(command);
  const attributes = response.UserAttributes || [];
  const email = attributes.find(attr => attr.Name === 'email')?.Value || null;
  const name = attributes.find(attr => attr.Name === 'name')?.Value || null;

  return {
    userId,
    enabled: response.Enabled !== false,
    status: response.UserStatus,
    email,
    name
  };
};

exports.handler = async (event) => {
  const startTime = Date.now();
  const logger = createLogger('create-task', event);
  
  logger.logInvocationStart(event);
  
  try {
    // Get user from JWT token
    const user = getUserFromEvent(event);
    
    // Only admins can create tasks
    requireAdmin(user);
    
    // Parse and validate request body
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }
    
    const body = JSON.parse(event.body);
    
    // Validate required fields
    validateRequiredFields(body, ['title', 'description']);
    
    const { title, description, priority, dueDate, timeEstimate, assignedTo, assignedUserIds } = body;

    if (assignedUserIds !== undefined && !Array.isArray(assignedUserIds)) {
      return errorResponse('assignedUserIds must be an array', 400);
    }
    
    // Validate and sanitize inputs
    const sanitizedTitle = sanitizeString(title, 200);
    const sanitizedDescription = sanitizeString(description, 2000);
    
    if (!sanitizedTitle || !sanitizedDescription) {
      return errorResponse('Title and description cannot be empty', 400);
    }
    
    // Validate priority if provided
    if (priority && !validatePriority(priority)) {
      return errorResponse('Invalid priority value. Must be: low, medium, or high', 400);
    }
    
    // Validate timeEstimate if provided (must be positive number)
    if (timeEstimate !== null && timeEstimate !== undefined && timeEstimate !== '') {
      const parsedTime = parseFloat(timeEstimate);
      if (isNaN(parsedTime) || parsedTime < 0) {
        return errorResponse('Invalid timeEstimate value. Must be a positive number', 400);
      }
    }
    
    const normalizedUserIds = [...new Set((assignedUserIds || []).filter(Boolean))];
    if (normalizedUserIds.length > 25) {
      return errorResponse('Cannot assign more than 25 users at once', 400);
    }

    const assigneesById = new Map();
    const missingUserIds = [];

    if (normalizedUserIds.length > 0) {
      const resolvedById = await Promise.all(
        normalizedUserIds.map(async (userId) => {
          try {
            return await getUserById(userId);
          } catch (error) {
            logger.warn('Failed to resolve user by ID during task creation', { userId, error: error.message });
            return null;
          }
        })
      );

      resolvedById.forEach((detail, index) => {
        if (!detail) {
          missingUserIds.push(normalizedUserIds[index]);
          return;
        }
        assigneesById.set(detail.userId, detail);
      });
    }

    if (assignedTo) {
      const assignedUserByEmail = await getUserByEmail(assignedTo);
      if (!assignedUserByEmail) {
        return errorResponse(`Assigned user not found for email: ${assignedTo}`, 400);
      }
      assigneesById.set(assignedUserByEmail.userId, assignedUserByEmail);
    }

    if (missingUserIds.length > 0) {
      return errorResponse(
        `Cannot assign task to unknown users: ${missingUserIds.join(', ')}`,
        400
      );
    }

    const assigneeDetails = Array.from(assigneesById.values());
    const invalidAssignees = assigneeDetails
      .filter(detail => !detail.enabled || detail.status !== 'CONFIRMED' || !detail.email)
      .map(detail => detail.userId);

    if (invalidAssignees.length > 0) {
      return errorResponse(
        `Cannot assign task to disabled, unconfirmed, or missing-email users: ${invalidAssignees.join(', ')}`,
        400
      );
    }

    const assignedEmails = assigneeDetails.map(detail => detail.email).filter(Boolean);
    const initialAssignedTo = assignedTo || (assignedEmails.length === 1 ? assignedEmails[0] : null);

    // Create task object
    const task = {
      taskId: uuidv4(),
      title: sanitizedTitle,
      description: sanitizedDescription,
      priority: priority || 'medium',
      status: 'open',
      dueDate: dueDate || null,
      timeEstimate: timeEstimate ? parseFloat(timeEstimate) : null,
      assignedTo: initialAssignedTo,
      createdBy: user.userId,
      createdByEmail: user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedUsers: assignedEmails
    };
    
    logger.logDBOperation('putItem', process.env.TASKS_TABLE, { taskId: task.taskId });
    
    // Save to DynamoDB
    await putItem(process.env.TASKS_TABLE, task);

    if (assigneeDetails.length > 0) {
      const assignments = assigneeDetails.map(detail => ({
        assignmentId: uuidv4(),
        taskId: task.taskId,
        userId: detail.userId,
        userEmail: detail.email,
        userName: detail.name,
        assignedBy: user.userId,
        assignedAt: new Date().toISOString()
      }));

      logger.logDBOperation('batchPutItems', process.env.ASSIGNMENTS_TABLE, { count: assignments.length });
      await batchPutItems(process.env.ASSIGNMENTS_TABLE, assignments);
    }
    
    logger.logInvocationEnd(201, Date.now() - startTime);
    logger.info('Task created successfully', { taskId: task.taskId, createdBy: user.email });
    
    return successResponse(task, 201);
    
  } catch (error) {
    logger.error('Error creating task', error);
    
    if (error.message === 'Admin access required') {
      return errorResponse(error.message, 403);
    }
    
    if (error.message.includes('required')) {
      return errorResponse(error.message, 400);
    }
    
    return errorResponse('Failed to create task', 500, error);
  }
};
