const { v4: uuidv4 } = require('uuid');
const { putItem } = require('../utils/dynamodb');
const { getUserFromEvent, requireAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { validateEnvVars, validateRequiredFields, validatePriority, sanitizeString } = require('../utils/validation');
const { createLogger } = require('../utils/logger');

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE']);

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
    
    const { title, description, priority, dueDate } = body;
    
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
    
    // Create task object
    const task = {
      taskId: uuidv4(),
      title: sanitizedTitle,
      description: sanitizedDescription,
      priority: priority || 'medium',
      status: 'open',
      dueDate: dueDate || null,
      createdBy: user.userId,
      createdByEmail: user.email,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      assignedUsers: []
    };
    
    logger.logDBOperation('putItem', process.env.TASKS_TABLE, { taskId: task.taskId });
    
    // Save to DynamoDB
    await putItem(process.env.TASKS_TABLE, task);
    
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
