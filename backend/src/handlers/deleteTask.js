const { getItem, deleteItem, query } = require('../utils/dynamodb');
const { getUserFromEvent, requireAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { validateEnvVars, validateUUID } = require('../utils/validation');
const { createLogger } = require('../utils/logger');

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE']);

exports.handler = async (event) => {
  const startTime = Date.now();
  const logger = createLogger('delete-task', event);
  
  logger.logInvocationStart(event);
  
  try {
    // Get user from JWT token
    const user = getUserFromEvent(event);
    
    // Only admins can delete tasks
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
    
    logger.logDBOperation('getItem', process.env.TASKS_TABLE, { taskId });
    
    // Check if task exists
    const task = await getItem(process.env.TASKS_TABLE, { taskId });
    
    if (!task) {
      logger.info('Task not found', { taskId });
      return errorResponse('Task not found', 404);
    }
    
    logger.info('Deleting task and assignments', { taskId, createdBy: task.createdBy });
    
    // Delete all assignments for this task
    const assignmentResult = await query(
      process.env.ASSIGNMENTS_TABLE,
      'taskId = :taskId',
      { ':taskId': taskId },
      'TaskIndex'
    );
    
    const assignments = assignmentResult.items || assignmentResult;
    
    logger.logDBOperation('deleteItems', process.env.ASSIGNMENTS_TABLE, { count: assignments.length });
    
    // Delete assignments in parallel for better performance
    await Promise.all(
      assignments.map(assignment => 
        deleteItem(process.env.ASSIGNMENTS_TABLE, { assignmentId: assignment.assignmentId })
      )
    );
    
    // Delete the task
    logger.logDBOperation('deleteItem', process.env.TASKS_TABLE, { taskId });
    await deleteItem(process.env.TASKS_TABLE, { taskId });
    
    logger.logInvocationEnd(200, Date.now() - startTime);
    logger.info('Task deleted successfully', { taskId, deletedBy: user.email, assignmentsDeleted: assignments.length });
    
    return successResponse({ 
      message: 'Task deleted successfully', 
      taskId,
      assignmentsDeleted: assignments.length 
    });
    
  } catch (error) {
    logger.error('Error deleting task', error);
    
    if (error.message === 'Admin access required') {
      return errorResponse(error.message, 403);
    }
    
    if (error.message.includes('required') || error.message.includes('Invalid')) {
      return errorResponse(error.message, 400);
    }
    
    return errorResponse('Failed to delete task', 500, error);
  }
};
