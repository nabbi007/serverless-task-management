const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { validateEnvVars } = require('../utils/validation');
const { createLogger } = require('../utils/logger');

const snsClient = new SNSClient({});

const TASK_ASSIGNED = 'TASK_ASSIGNED';
const TASK_STATUS_CHANGED = 'TASK_STATUS_CHANGED';

const getTableNameFromArn = (arn = '') => {
  const match = arn.match(/table\/([^/]+)/);
  return match ? match[1] : null;
};

const getString = (image, key) => {
  if (!image || !image[key]) {
    return null;
  }
  return image[key].S || null;
};

exports.handler = async (event) => {
  const startTime = Date.now();
  const logger = createLogger('stream-processor', event);

  logger.logInvocationStart(event);

  try {
    validateEnvVars([
      'TASKS_TABLE_NAME',
      'ASSIGNMENTS_TABLE_NAME',
      'SNS_TASK_ASSIGNED_TOPIC_ARN',
      'SNS_TASK_STATUS_TOPIC_ARN'
    ]);

    const tasksTableName = process.env.TASKS_TABLE_NAME;
    const assignmentsTableName = process.env.ASSIGNMENTS_TABLE_NAME;
    const taskAssignedTopicArn = process.env.SNS_TASK_ASSIGNED_TOPIC_ARN;
    const taskStatusTopicArn = process.env.SNS_TASK_STATUS_TOPIC_ARN;

    const records = event.Records || [];
    const publishPromises = [];

    for (const record of records) {
      try {
        const tableName = getTableNameFromArn(record.eventSourceARN);
        const eventName = record.eventName;

        if (!tableName || !eventName) {
          continue;
        }

        if (tableName === assignmentsTableName && eventName === 'INSERT') {
          const image = record.dynamodb?.NewImage;
          const message = {
            type: TASK_ASSIGNED,
            assignmentId: getString(image, 'assignmentId'),
            taskId: getString(image, 'taskId'),
            assignedToUserId: getString(image, 'userId'),
            assignedToEmail: getString(image, 'userEmail'),
            assignedToName: getString(image, 'userName'),
            assignedBy: getString(image, 'assignedBy'),
            assignedAt: getString(image, 'assignedAt')
          };

          if (!message.taskId || !message.assignmentId) {
            logger.warn('Assignment record missing required fields', { message });
            continue;
          }

          publishPromises.push(
            snsClient.send(
              new PublishCommand({
                TopicArn: taskAssignedTopicArn,
                Message: JSON.stringify(message)
              })
            )
          );
        }

        if (tableName === tasksTableName && eventName === 'MODIFY') {
          const newImage = record.dynamodb?.NewImage;
          const oldImage = record.dynamodb?.OldImage;
          const newStatus = getString(newImage, 'status');
          const oldStatus = getString(oldImage, 'status');

          if (!newStatus || !oldStatus || newStatus === oldStatus) {
            continue;
          }

          const message = {
            type: TASK_STATUS_CHANGED,
            taskId: getString(newImage, 'taskId'),
            oldStatus,
            newStatus,
            updatedBy: getString(newImage, 'updatedBy'),
            updatedAt: getString(newImage, 'updatedAt')
          };

          if (!message.taskId) {
            logger.warn('Status change record missing taskId', { message });
            continue;
          }

          publishPromises.push(
            snsClient.send(
              new PublishCommand({
                TopicArn: taskStatusTopicArn,
                Message: JSON.stringify(message)
              })
            )
          );
        }
      } catch (recordError) {
        logger.error('Error processing stream record', recordError);
      }
    }

    if (publishPromises.length > 0) {
      await Promise.all(publishPromises);
    }

    logger.logInvocationEnd(200, Date.now() - startTime);
    return { statusCode: 200 };
  } catch (error) {
    logger.error('Stream processor failed', error);
    logger.logInvocationEnd(500, Date.now() - startTime);
    throw error;
  }
};
