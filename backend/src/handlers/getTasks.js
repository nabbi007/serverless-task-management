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
    
    let result;
    
    if (isAdmin(user)) {
      console.log('Admin fetching all tasks', { limit });
      
      // Admins can see all tasks - use scan with pagination
      result = await scan(process.env.TASKS_TABLE, null, null, limit, lastKey);
      
    } else {
      console.log('Member fetching assigned tasks', { userId: user.userId, limit });
      
      // Members can only see tasks assigned to them
      const assignmentResult = await query(
        process.env.ASSIGNMENTS_TABLE,
        'userId = :userId',
        { ':userId': user.userId },
        'UserIndex',
        limit
      );
      
      const taskIds = assignmentResult.items.map(a => a.taskId);
      
      if (taskIds.length === 0) {
        console.log('No tasks assigned to user');
        return successResponse({ tasks: [], lastEvaluatedKey: null }, 200, true); // Cacheable
      }
      
      // Get task details
      const tasks = [];
      for (const taskId of taskIds) {
        const taskResult = await query(
          process.env.TASKS_TABLE,
          'taskId = :taskId',
          { ':taskId': taskId }
        );
        if (taskResult.items.length > 0) {
          tasks.push(taskResult.items[0]);
        }
      }
      
      result = { 
        items: tasks,
        lastEvaluatedKey: assignmentResult.lastEvaluatedKey 
      };
    }
    
    const duration = Date.now() - startTime;
    console.log('Tasks fetched successfully', { 
      count: result.items.length, 
      duration: `${duration}ms`,
      hasMore: !!result.lastEvaluatedKey 
    });
    
    return successResponse({ 
      tasks: result.items,
      lastEvaluatedKey: result.lastEvaluatedKey ? 
        encodeURIComponent(JSON.stringify(result.lastEvaluatedKey)) : null
    }, 200, true); // Cacheable for read operations
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return errorResponse(error.message || 'Failed to fetch tasks');
  }
};
