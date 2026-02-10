const { getItem, query } = require('../utils/dynamodb');
const { getUserFromEvent, isAdmin, canAccessTask } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { getUserEmail } = require('../utils/notifications');
const { validateEnvVars } = require('../utils/validation');

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE', 'USER_POOL_ID']);

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
    
    // All authenticated users can view tasks if they have access
    
    // Get all assignments for this task
    let assignedUsers = [];
    try {
      const assignmentsResult = await query(
        process.env.ASSIGNMENTS_TABLE,
        'taskId = :taskId',
        { ':taskId': taskId },
        'TaskIndex'
      );
      assignedUsers = await Promise.all(
        assignmentsResult.items.map(async (assignment) => ({
          userId: assignment.userId,
          userName: assignment.userName,
          userEmail: assignment.userEmail || await getUserEmail(assignment.userId),
          assignedAt: assignment.assignedAt
        }))
      );
    } catch (assignmentError) {
      console.error('Error fetching assignments for task:', assignmentError);
      // Continue without assignments if query fails
    }

    if (assignedUsers.length === 0 && task.assignedTo) {
      assignedUsers = [{
        userId: null,
        userName: null,
        userEmail: task.assignedTo,
        assignedAt: null
      }];
    }
    
    const taskWithAssignments = {
      ...task,
      assignedUsers: assignedUsers
    };

    if (!isAdmin(user) && !canAccessTask(user, taskWithAssignments)) {
      return errorResponse('Access denied', 403);
    }
    
    const duration = Date.now() - startTime;
    console.log('Task fetched successfully', { 
      taskId, 
      duration: `${duration}ms` 
    });
    
    return successResponse(taskWithAssignments, 200, false);
    
  } catch (error) {
    console.error('Error fetching task:', error);
    return errorResponse(error.message || 'Failed to fetch task');
  }
};
