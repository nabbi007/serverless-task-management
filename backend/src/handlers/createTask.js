const { v4: uuidv4 } = require('uuid');
const { putItem } = require('../utils/dynamodb');
const { getUserFromEvent, requireAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { sendTaskAssignmentNotification } = require('../utils/notifications');
const { validateEnvVars, validateRequiredFields, validatePriority, sanitizeString } = require('../utils/validation');
const { createLogger } = require('../utils/logger');
const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');

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
    
    const { title, description, priority, dueDate, timeEstimate, assignedTo } = body;
    
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
    
    // Create task object
    const task = {
      taskId: uuidv4(),
      title: sanitizedTitle,
      description: sanitizedDescription,
      priority: priority || 'medium',
      status: 'open',
      dueDate: dueDate || null,
      timeEstimate: timeEstimate ? parseFloat(timeEstimate) : null,
      assignedTo: assignedTo || null,
      createdBy: user.userId,
      createdByEmail: user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedUsers: []
    };
    
    logger.logDBOperation('putItem', process.env.TASKS_TABLE, { taskId: task.taskId });
    
    // Save to DynamoDB
    await putItem(process.env.TASKS_TABLE, task);

    // If assignedTo provided, create assignment record and notify
    if (assignedTo) {
      try {
        const assignedUser = await getUserByEmail(assignedTo);
        if (assignedUser && assignedUser.enabled && assignedUser.status === 'CONFIRMED') {
          const assignment = {
            assignmentId: uuidv4(),
            taskId: task.taskId,
            userId: assignedUser.userId,
            userEmail: assignedUser.email,
            userName: assignedUser.name,
            assignedBy: user.userId,
            assignedAt: new Date().toISOString()
          };

          await putItem(process.env.ASSIGNMENTS_TABLE, assignment);

          task.assignedUsers = [assignedUser.email];
          await putItem(process.env.TASKS_TABLE, task);

          await sendTaskAssignmentNotification(task, [assignedUser.userId]);
        } else if (assignedUser) {
          logger.warn('Assigned user is disabled or unconfirmed', { assignedTo });
        } else {
          logger.warn('Assigned user not found by email', { assignedTo });
        }
      } catch (assignmentError) {
        logger.warn('Failed to create assignment on task creation', { error: assignmentError.message });
      }
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
