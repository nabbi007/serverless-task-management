const { getItem, updateItem, query } = require('../utils/dynamodb');
const { getUserFromEvent, canUpdateTask } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { sendTaskStatusChangeNotification } = require('../utils/notifications');
const { validateEnvVars, validateUUID, validateStatus, validatePriority, sanitizeString } = require('../utils/validation');
const { createLogger } = require('../utils/logger');

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE']);

exports.handler = async (event) => {
  const startTime = Date.now();
  const logger = createLogger('update-task', event);
  
  logger.logInvocationStart(event);
  
  try {
    // Get user from JWT token
    const user = getUserFromEvent(event);
    
    // Get task ID from path parameters
    const taskId = event.pathParameters?.id;
    
    if (!taskId) {
      return errorResponse('Task ID is required', 400);
    }
    
    // Validate UUID format
    if (!validateUUID(taskId)) {
      logger.warn('Invalid task ID format', { taskId });
      return errorResponse('Invalid task ID format', 400);
    }
    
    // Parse and validate request body
    if (!event.body) {
      return errorResponse('Request body is required', 400);
    }
    
    const body = JSON.parse(event.body);
    const { title, description, status, priority, dueDate, timeEstimate, assignedTo } = body;
    
    // Validate enums if provided
    if (status && !validateStatus(status)) {
      return errorResponse('Invalid status value. Must be: open, in-progress, completed, or closed', 400);
    }
    
    if (priority && !validatePriority(priority)) {
      return errorResponse('Invalid priority value. Must be: low, medium, or high', 400);
    }
    
    // Validate timeEstimate if provided
    if (timeEstimate !== undefined && timeEstimate !== null && (isNaN(timeEstimate) || timeEstimate < 0)) {
      return errorResponse('Invalid timeEstimate value. Must be a positive number', 400);
    }
    
    logger.logDBOperation('getItem', process.env.TASKS_TABLE, { taskId });
    
    // Fetch existing task
    const existingTask = await getItem(process.env.TASKS_TABLE, { taskId });
    
    if (!existingTask) {
      logger.info('Task not found', { taskId });
      return errorResponse('Task not found', 404);
    }
    
    // Check if user can update this task
    if (!canUpdateTask(user, existingTask)) {
      logger.warn('Access denied', { userId: user.userId, taskId });
      return errorResponse('Access denied', 403);
    }
    
    // Build update expression
    const updateExpressions = [];
    const expressionAttributeValues = {};
    const expressionAttributeNames = {};
    
    if (title !== undefined) {
      const sanitizedTitle = sanitizeString(title, 200);
      if (!sanitizedTitle) {
        return errorResponse('Title cannot be empty', 400);
      }
      updateExpressions.push('#title = :title');
      expressionAttributeNames['#title'] = 'title';
      expressionAttributeValues[':title'] = sanitizedTitle;
    }
    
    if (description !== undefined) {
      const sanitizedDescription = sanitizeString(description, 2000);
      if (!sanitizedDescription) {
        return errorResponse('Description cannot be empty', 400);
      }
      updateExpressions.push('description = :description');
      expressionAttributeValues[':description'] = sanitizedDescription;
    }
    
    if (status !== undefined) {
      updateExpressions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = status;
    }
    
    if (priority !== undefined) {
      updateExpressions.push('priority = :priority');
      expressionAttributeValues[':priority'] = priority;
    }
    
    if (dueDate !== undefined) {
      updateExpressions.push('dueDate = :dueDate');
      expressionAttributeValues[':dueDate'] = dueDate;
    }
    
    if (timeEstimate !== undefined) {
      updateExpressions.push('timeEstimate = :timeEstimate');
      expressionAttributeValues[':timeEstimate'] = timeEstimate;
    }
    
    if (assignedTo !== undefined) {
      updateExpressions.push('assignedTo = :assignedTo');
      expressionAttributeValues[':assignedTo'] = assignedTo;
    }
    
    updateExpressions.push('updatedAt = :updatedAt');
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    
    updateExpressions.push('updatedBy = :updatedBy');
    expressionAttributeValues[':updatedBy'] = user.userId;
    
    if (updateExpressions.length === 2) { // Only updatedAt and updatedBy
      return errorResponse('No fields to update', 400);
    }
    
    const updateExpression = 'SET ' + updateExpressions.join(', ');
    
    logger.logDBOperation('updateItem', process.env.TASKS_TABLE, { taskId, fields: Object.keys(body) });
    
    // Update task in DynamoDB
    const updatedTask = await updateItem(
      process.env.TASKS_TABLE,
      { taskId },
      updateExpression,
      expressionAttributeValues,
      expressionAttributeNames
    );
    
    // Send notifications if status changed
    if (status && status !== existingTask.status) {
      logger.info('Status changed, sending notifications', { 
        taskId, 
        oldStatus: existingTask.status, 
        newStatus: status 
      });
      
      // Get all assigned users
      const assignmentResult = await query(
        process.env.ASSIGNMENTS_TABLE,
        'taskId = :taskId',
        { ':taskId': taskId },
        'TaskIndex'
      );
      
      const assignedUserIds = assignmentResult.items ? 
        assignmentResult.items.map(a => a.userId) : 
        assignmentResult.map(a => a.userId);
      
      // Add task creator to notification list
      if (!assignedUserIds.includes(existingTask.createdBy)) {
        assignedUserIds.push(existingTask.createdBy);
      }
      
      await sendTaskStatusChangeNotification(
        updatedTask,
        existingTask.status,
        status,
        assignedUserIds
      );
    }
    
    logger.logInvocationEnd(200, Date.now() - startTime);
    logger.info('Task updated successfully', { taskId, updatedBy: user.email });
    
    return successResponse(updatedTask);
    
  } catch (error) {
    logger.error('Error updating task', error);
    
    if (error.message === 'Access denied') {
      return errorResponse(error.message, 403);
    }
    
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return errorResponse(error.message, 400);
    }
    
    return errorResponse('Failed to update task', 500, error);
  }
};
