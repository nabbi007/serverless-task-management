const { scan, query } = require('../utils/dynamodb');
const { getUserFromEvent, isAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { validateEnvVars } = require('../utils/validation');

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE']);

exports.handler = async (event) => {
  const startTime = Date.now();
  
  console.log('getTasks invoked', { 
    requestId: event.requestContext.requestId,
    userId: event.requestContext.authorizer?.claims?.sub 
  });
  
  try {
    // Get user from JWT token
    const user = getUserFromEvent(event);
    
    // Parse pagination parameters
    const limit = event.queryStringParameters?.limit ? 
      Math.min(parseInt(event.queryStringParameters.limit), 100) : 50;
    const lastKey = event.queryStringParameters?.lastKey ? 
      JSON.parse(decodeURIComponent(event.queryStringParameters.lastKey)) : null;
    
    // All authenticated users can see all tasks
    console.log('Fetching all tasks', { limit, isAdmin: isAdmin(user) });
    
    const result = await scan(process.env.TASKS_TABLE, null, null, limit, lastKey);
    
    if (result.items.length === 0) {
      console.log('No tasks found');
      return successResponse({ tasks: [], lastEvaluatedKey: null }, 200, true);
    }
    
    const tasks = result.items;
    
    // For each task, get assignment details (for displaying who is assigned)
    for (const task of tasks) {
      const assignmentResult = await query(
        process.env.ASSIGNMENTS_TABLE,
        'taskId = :taskId',
        { ':taskId': task.taskId }
      );
      task.assignedUsers = assignmentResult.items.map(a => a.userId);
    }
    
    const duration = Date.now() - startTime;
    console.log('Tasks fetched successfully', { 
      count: tasks.length, 
      duration: `${duration}ms`,
      hasMore: !!result.lastEvaluatedKey 
    });
    
    return successResponse({ 
      tasks: tasks,
      lastEvaluatedKey: result.lastEvaluatedKey ? 
        encodeURIComponent(JSON.stringify(result.lastEvaluatedKey)) : null
    }, 200, true); // Cacheable for read operations
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return errorResponse(error.message || 'Failed to fetch tasks');
  }
};
