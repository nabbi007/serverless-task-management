const { getItem, query } = require('../utils/dynamodb');
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
    
    // Get task by ID
    const task = await getItem(
      process.env.TASKS_TABLE,
      { taskId: taskId }
    );
    
    if (!task) {
      return errorResponse('Task not found', 404);
    }
    
    // All authenticated users can view tasks
    // Update/Delete permissions are checked in those handlers
    
    // Get all assignments for this task
    let assignedUsers = [];
    try {
      const assignmentsResult = await query(
        process.env.ASSIGNMENTS_TABLE,
        'taskId = :taskId',
        { ':taskId': taskId },
        'TaskIndex'
      );
      assignedUsers = assignmentsResult.items.map(a => ({
        userId: a.userId,
        userName: a.userName,
        userEmail: a.userEmail,
        assignedAt: a.assignedAt
      }));
    } catch (assignmentError) {
      console.error('Error fetching assignments for task:', assignmentError);
      // Continue without assignments if query fails
    }
    
    const taskWithAssignments = {
      ...task,
      assignedUsers: assignedUsers
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
