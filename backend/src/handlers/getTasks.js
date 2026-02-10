const { scan, query, getItem } = require('../utils/dynamodb');
const { getUserFromEvent, isAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { getUserEmail } = require('../utils/notifications');
const { validateEnvVars } = require('../utils/validation');

// Validate environment variables on cold start
validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE', 'USER_POOL_ID']);

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
    
    const admin = isAdmin(user);
    console.log('Fetching tasks', { limit, isAdmin: admin });

    if (admin) {
      const result = await scan(process.env.TASKS_TABLE, null, null, limit, lastKey);

      if (result.items.length === 0) {
        console.log('No tasks found');
        return successResponse({ tasks: [], lastEvaluatedKey: null }, 200, true);
      }

      const tasks = result.items;

      // For each task, get assignment details (for displaying who is assigned)
      for (const task of tasks) {
        try {
          const assignmentResult = await query(
            process.env.ASSIGNMENTS_TABLE,
            'taskId = :taskId',
            { ':taskId': task.taskId },
            'TaskIndex'
          );
          const emails = await Promise.all(
            assignmentResult.items.map(a => a.userEmail || getUserEmail(a.userId))
          );
          const resolvedEmails = emails.filter(Boolean);
          if (resolvedEmails.length === 0 && task.assignedTo) {
            task.assignedUsers = [task.assignedTo];
          } else {
            task.assignedUsers = resolvedEmails;
          }
        } catch (assignmentError) {
          console.error(`Error fetching assignments for task ${task.taskId}:`, assignmentError);
          task.assignedUsers = [];
        }
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
      }, 200, false);
    }

    // Members can only view tasks assigned to them
    const assignmentResult = await query(
      process.env.ASSIGNMENTS_TABLE,
      'userId = :userId',
      { ':userId': user.userId },
      'UserIndex',
      limit,
      lastKey
    );

    const assignments = assignmentResult.items || [];
    const uniqueTaskIds = [...new Set(assignments.map(a => a.taskId))];

    const tasks = (await Promise.all(
      uniqueTaskIds.map(taskId => getItem(process.env.TASKS_TABLE, { taskId }))
    )).filter(Boolean);

    // Backward-compatibility: include tasks assigned via legacy assignedTo field
    if (user.email) {
      try {
        const assignedToResult = await scan(
          process.env.TASKS_TABLE,
          'assignedTo = :assignedTo',
          { ':assignedTo': user.email }
        );
        const taskMap = new Map(tasks.map(task => [task.taskId, task]));
        assignedToResult.items.forEach(task => {
          if (!taskMap.has(task.taskId)) {
            tasks.push(task);
            taskMap.set(task.taskId, task);
          }
        });
      } catch (assignedToError) {
        console.error('Error fetching tasks by assignedTo:', assignedToError);
      }
    }

    await Promise.all(
      tasks.map(async (task) => {
        try {
          const taskAssignments = await query(
            process.env.ASSIGNMENTS_TABLE,
            'taskId = :taskId',
            { ':taskId': task.taskId },
            'TaskIndex'
          );
          const emails = await Promise.all(
            taskAssignments.items.map(a => a.userEmail || getUserEmail(a.userId))
          );
          const resolvedEmails = emails.filter(Boolean);
          if (resolvedEmails.length === 0 && task.assignedTo) {
            task.assignedUsers = [task.assignedTo];
          } else {
            task.assignedUsers = resolvedEmails;
          }
        } catch (assignmentError) {
          console.error(`Error fetching assignments for task ${task.taskId}:`, assignmentError);
          task.assignedUsers = [];
        }
      })
    );

    const isTaskAssignedToUser = (task) => {
      if (!task) return false;
      if (task.assignedTo && (task.assignedTo === user.email || task.assignedTo === user.userId)) {
        return true;
      }
      if (!task.assignedUsers || task.assignedUsers.length === 0) {
        return false;
      }
      return task.assignedUsers.some(assignedUser => {
        if (typeof assignedUser === 'string') {
          return assignedUser === user.email || assignedUser === user.userId;
        }
        return assignedUser.userEmail === user.email || assignedUser.userId === user.userId;
      });
    };

    const filteredTasks = tasks.filter(isTaskAssignedToUser);

    const duration = Date.now() - startTime;
    console.log('Member tasks fetched successfully', {
      count: filteredTasks.length,
      duration: `${duration}ms`,
      hasMore: !!assignmentResult.lastEvaluatedKey
    });

    return successResponse({
      tasks: filteredTasks,
      lastEvaluatedKey: assignmentResult.lastEvaluatedKey ?
        encodeURIComponent(JSON.stringify(assignmentResult.lastEvaluatedKey)) : null
    }, 200, false);
    
  } catch (error) {
    console.error('Error fetching tasks:', error);
    return errorResponse(error.message || 'Failed to fetch tasks');
  }
};
