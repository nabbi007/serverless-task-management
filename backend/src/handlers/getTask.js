const { query } = require('../utils/dynamodb');
const { getUserFromEvent, isAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { validateEnvVars } = require('../utils/validation');

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE']);

exports.handler = async (event) => {
  const startTime = Date.now();
  
  console.log('getTask invoked', { 
    requestId: event.requestContext.requestId,
    userId: event.requestContext.authorizer?.claims?.sub 
  });
  
  try {
    // Get task ID from path parameters
    const taskId = event.pathParameters?.id;
    
    if (!taskId) {
      return errorResponse('Task ID is required', 400);
    }
    
    // Get user from JWT token
    const user = getUserFromEvent(event);
    
    // Query task by ID
    const taskResult = await query(
      process.env.TASKS_TABLE,
      'taskId = :taskId',
      { ':taskId': taskId }
    );
    
    if (taskResult.items.length === 0) {
      return errorResponse('Task not found', 404);
    }
    
    const task = taskResult.items[0];
    
    // Check authorization
    if (!isAdmin(user)) {
      // Members can only see tasks assigned to them
      const assignmentResult = await query(
        process.env.ASSIGNMENTS_TABLE,
        'taskId = :taskId AND userId = :userId',
        { ':taskId': taskId, ':userId': user.userId },
        'TaskUserIndex'
      );
      
      if (assignmentResult.items.length === 0) {
        return errorResponse('Access denied', 403);
      }
    }
    
    // Get all assignments for this task
    const assignmentsResult = await query(
      process.env.ASSIGNMENTS_TABLE,
      'taskId = :taskId',
      { ':taskId': taskId }
    );
    
    const taskWithAssignments = {
      ...task,
      assignedUsers: assignmentsResult.items.map(a => ({
        userId: a.userId,
        userName: a.userName,
        userEmail: a.userEmail,
        assignedAt: a.assignedAt
      }))
    };
    
    const duration = Date.now() - startTime;
    console.log('Task fetched successfully', { 
      taskId, 
      duration: `${duration}ms` 
    });
    
    return successResponse(taskWithAssignments, 200, true); // Cacheable
    
  } catch (error) {
    console.error('Error fetching task:', error);
    return errorResponse(error.message || 'Failed to fetch task');
  }
};
