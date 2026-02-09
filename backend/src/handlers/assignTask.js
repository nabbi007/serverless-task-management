const { v4: uuidv4 } = require('uuid');
const { getItem, putItem, query, batchPutItems } = require('../utils/dynamodb');
const { getUserFromEvent, requireAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { sendTaskAssignmentNotification } = require('../utils/notifications');
const { validateEnvVars, validateUUID } = require('../utils/validation');
const { createLogger } = require('../utils/logger');
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const cognitoClient = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || 'eu-west-1' });

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE']);

exports.handler = async (event) => {
  const startTime = Date.now();
  const logger = createLogger('assign-task', event);
  
  logger.logInvocationStart(event);
  
  try {
    // Get user from JWT token
    const user = getUserFromEvent(event);
    
    // Only admins can assign tasks
    requireAdmin(user);
    
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
    const { userIds } = body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return errorResponse('User IDs array is required', 400);
    }
    
    // Limit batch size for cost optimization
    if (userIds.length > 25) {
      return errorResponse('Cannot assign more than 25 users at once', 400);
    }
    
    logger.logDBOperation('getItem', process.env.TASKS_TABLE, { taskId });
    
    // Check if task exists
    const task = await getItem(process.env.TASKS_TABLE, { taskId });
    
    if (!task) {
      logger.info('Task not found', { taskId });
      return errorResponse('Task not found', 404);
    }
    
    // Get existing assignments
    const existingResult = await query(
      process.env.ASSIGNMENTS_TABLE,
      'taskId = :taskId',
      { ':taskId': taskId },
      'TaskIndex'
    );
    
    const existingAssignments = existingResult.items || existingResult;
    const existingUserIds = existingAssignments.map(a => a.userId);
    
    // Filter out users who are already assigned
    const newUserIds = userIds.filter(userId => !existingUserIds.includes(userId));
    
    if (newUserIds.length === 0) {
      logger.info('All users already assigned', { taskId, userIds });
      return errorResponse('All specified users are already assigned to this task', 400);
    }
    
    // Validate that all users exist and are enabled in Cognito
    // Note: userIds should be Cognito sub IDs. In production, consider:
    // 1. Accepting emails and looking up subs, or
    // 2. Maintaining a user cache in DynamoDB with sub->email->status mapping
    // For now, we proceed with assignment (notifications will fail for invalid users)
    logger.info('Assigning task to users', { taskId, newUserCount: newUserIds.length });
    
    // Create assignments
    const assignments = newUserIds.map(userId => ({
      assignmentId: uuidv4(),
      taskId,
      userId,
      assignedBy: user.userId,
      assignedAt: new Date().toISOString()
    }));
    
    // Use batch put for better performance (10x faster)
    logger.logDBOperation('batchPutItems', process.env.ASSIGNMENTS_TABLE, { count: assignments.length });
    await batchPutItems(process.env.ASSIGNMENTS_TABLE, assignments);
    
    // Update task's assignedUsers array
    const allAssignedUserIds = [...existingUserIds, ...newUserIds];
    task.assignedUsers = allAssignedUserIds;
    task.updatedAt = new Date().toISOString();
    task.updatedBy = user.userId;
    
    await putItem(process.env.TASKS_TABLE, task);
    
    // Send notifications to newly assigned users (async, don't wait)
    sendTaskAssignmentNotification(task, newUserIds).catch(err => 
      logger.warn('Failed to send notifications', { error: err.message })
    );
    
    logger.logInvocationEnd(200, Date.now() - startTime);
    logger.info('Task assigned successfully', { 
      taskId, 
      newUsers: newUserIds.length, 
      totalUsers: allAssignedUserIds.length 
    });
    
    return successResponse({
      message: 'Task assigned successfully',
      taskId,
      newAssignments: assignments.length,
      totalAssignedUsers: allAssignedUserIds.length
    });
    
  } catch (error) {
    logger.error('Error assigning task', error);
    
    if (error.message === 'Admin access required') {
      return errorResponse(error.message, 403);
    }
    
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return errorResponse(error.message, 400);
    }
    
    return errorResponse('Failed to assign task', 500, error);
  }
};
