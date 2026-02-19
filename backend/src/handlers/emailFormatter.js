const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');
const { getItem, query } = require('../utils/dynamodb');
const { getUserEmail, listAdminUserIds, sendEmail } = require('../utils/notifications');
const { validateEnvVars } = require('../utils/validation');
const { createLogger } = require('../utils/logger');

const snsClient = new SNSClient({});

const formatTaskSummary = (task) => {
  const dueDate = task?.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
  const priority = task?.priority || 'Not set';
  const status = task?.status || 'open';
  return `Task: ${task?.title || 'Untitled'}\n` +
    `Description: ${task?.description || 'No description'}\n` +
    `Priority: ${priority}\n` +
    `Status: ${status}\n` +
    `Due Date: ${dueDate}`;
};

const resolveEmail = async (value) => {
  if (!value) {
    return null;
  }
  if (value.includes('@')) {
    return value;
  }
  return await getUserEmail(value);
};

const getAssignmentEmails = async (taskId) => {
  const assignmentResult = await query(
    process.env.ASSIGNMENTS_TABLE,
    'taskId = :taskId',
    { ':taskId': taskId },
    'TaskIndex'
  );

  const assignments = assignmentResult.items || [];
  const emails = await Promise.all(
    assignments.map((assignment) => resolveEmail(assignment.userEmail || assignment.userId))
  );

  return emails.filter(Boolean);
};

const getAdminEmails = async () => {
  const adminUserIds = await listAdminUserIds();
  const adminEmails = await Promise.all(adminUserIds.map((id) => resolveEmail(id)));
  return adminEmails.filter(Boolean);
};

const getRecipientsFromValues = async (values = []) => {
  const uniqueValues = [...new Set(values.filter(Boolean))];
  const resolved = await Promise.all(uniqueValues.map((value) => resolveEmail(value)));
  return [...new Set(resolved.filter(Boolean))];
};

const publishFallbackAlert = async (recipient, eventType, task, logger) => {
  if (!recipient || !process.env.SNS_FALLBACK_TOPIC_ARN) {
    return false;
  }

  const message =
    `Task notification fallback\n` +
    `Event: ${eventType}\n` +
    `Task: ${task?.title || 'Task updated'}\n` +
    `Please open the Task Management app to view full details.`;

  await snsClient.send(
    new PublishCommand({
      TopicArn: process.env.SNS_FALLBACK_TOPIC_ARN,
      Subject: 'Task Update Alert',
      Message: message,
      MessageAttributes: {
        recipient: {
          DataType: 'String',
          StringValue: recipient
        },
        eventType: {
          DataType: 'String',
          StringValue: eventType
        }
      }
    })
  );

  logger.info('Fallback SNS alert published', { recipient, eventType, taskId: task?.taskId });
  return true;
};

const deliverWithFallback = async (recipient, subject, body, eventType, task, logger) => {
  try {
    await sendEmail(recipient, subject, body);
    return 'ses';
  } catch (sesError) {
    logger.warn('SES delivery failed; trying SNS fallback', {
      recipient,
      eventType,
      taskId: task?.taskId,
      error: sesError.message
    });

    try {
      const fallbackSent = await publishFallbackAlert(recipient, eventType, task, logger);
      return fallbackSent ? 'sns' : 'failed';
    } catch (snsError) {
      logger.error('SNS fallback delivery failed', {
        recipient,
        eventType,
        taskId: task?.taskId,
        error: snsError.message
      });
      return 'failed';
    }
  }
};

const handleTaskAssigned = async (message, logger) => {
  const { taskId, assignmentId, assignedToEmail, assignedToUserId, assignedBy } = message;

  if (!taskId) {
    logger.warn('Assignment notification missing taskId', { message });
    return;
  }

  const task = await getItem(process.env.TASKS_TABLE, { taskId });
  if (!task) {
    logger.warn('Task not found for assignment notification', { taskId, assignmentId });
    return;
  }

  const assigneeEmail = await resolveEmail(assignedToEmail || assignedToUserId);
  if (!assigneeEmail) {
    logger.warn('No recipient email for assignment notification', { taskId, assignmentId });
    return;
  }

  const assignedByEmail = await resolveEmail(assignedBy);
  const adminEmails = await getAdminEmails();
  const recipients = new Set([
    assigneeEmail,
    assignedByEmail,
    ...adminEmails
  ].filter(Boolean));

  if (recipients.size === 0) {
    logger.warn('No recipients resolved for assignment notification', { taskId, assignmentId });
    return;
  }

  const subject = `New Task Assignment: ${task.title || 'Untitled'}`;
  const body =
    `A task assignment was made.\n` +
    `Assigned to: ${assigneeEmail}\n` +
    `${assignedByEmail ? `Assigned by: ${assignedByEmail}\n` : ''}\n` +
    `${formatTaskSummary(task)}`;

  const deliveryStats = { ses: 0, sns: 0, failed: 0 };
  for (const email of recipients) {
    const channel = await deliverWithFallback(
      email,
      subject,
      body,
      'TASK_ASSIGNED',
      task,
      logger
    );
    deliveryStats[channel] += 1;
  }

  logger.info('Assignment notifications processed', {
    taskId,
    recipients: recipients.size,
    delivery: deliveryStats
  });
};

const handleStatusChanged = async (message, logger) => {
  const { taskId, oldStatus, newStatus } = message;

  if (!taskId || !oldStatus || !newStatus) {
    logger.warn('Status change notification missing required fields', { message });
    return;
  }

  const task = await getItem(process.env.TASKS_TABLE, { taskId });
  if (!task) {
    logger.warn('Task not found for status change notification', { taskId });
    return;
  }

  const assignedEmails = await getAssignmentEmails(taskId);
  const fallbackAssigned = Array.isArray(task.assignedUsers) ? task.assignedUsers : [];
  const adminEmails = await getAdminEmails();

  const recipients = new Set([
    ...assignedEmails,
    ...fallbackAssigned,
    ...adminEmails
  ].filter(Boolean));

  if (recipients.size === 0) {
    logger.info('No recipients for status change notification', { taskId });
    return;
  }

  const subject = `Task Status Updated: ${task.title || 'Untitled'}`;
  const body = `Task status changed from ${oldStatus} to ${newStatus}.\n\n${formatTaskSummary({
    ...task,
    status: newStatus
  })}`;

  const deliveryStats = { ses: 0, sns: 0, failed: 0 };
  for (const email of recipients) {
    const channel = await deliverWithFallback(
      email,
      subject,
      body,
      'TASK_STATUS_CHANGED',
      task,
      logger
    );
    deliveryStats[channel] += 1;
  }

  logger.info('Status change notifications processed', {
    taskId,
    recipients: recipients.size,
    delivery: deliveryStats
  });
};

const handleTaskDeleted = async (message, logger) => {
  const { taskId, title, description, assignedUsers = [], assignedTo, deletedAt } = message;

  if (!taskId) {
    logger.warn('Task delete notification missing taskId', { message });
    return;
  }

  const recipients = await getRecipientsFromValues([
    ...(Array.isArray(assignedUsers) ? assignedUsers : []),
    assignedTo
  ]);

  if (recipients.length === 0) {
    logger.info('No recipients for task delete notification', { taskId });
    return;
  }

  const subject = `Task Deleted: ${title || 'Untitled'}`;
  const deletedDate = deletedAt ? new Date(deletedAt).toLocaleString() : new Date().toLocaleString();
  const body =
    `A task assigned to you has been deleted.\n\n` +
    `Task: ${title || 'Untitled'}\n` +
    `Description: ${description || 'No description'}\n` +
    `Deleted at: ${deletedDate}\n\n` +
    `Open the app to view your current task list.`;

  const deliveryStats = { ses: 0, sns: 0, failed: 0 };
  for (const email of recipients) {
    const channel = await deliverWithFallback(
      email,
      subject,
      body,
      'TASK_DELETED',
      { taskId, title },
      logger
    );
    deliveryStats[channel] += 1;
  }

  logger.info('Task delete notifications processed', {
    taskId,
    recipients: recipients.length,
    delivery: deliveryStats
  });
};

exports.handler = async (event) => {
  const startTime = Date.now();
  const logger = createLogger('email-formatter', event);

  logger.logInvocationStart(event);

  try {
    validateEnvVars(['TASKS_TABLE', 'ASSIGNMENTS_TABLE', 'USER_POOL_ID', 'SES_FROM_EMAIL']);

    const records = event.Records || [];

    for (const record of records) {
      const messageString = record?.Sns?.Message;
      if (!messageString) {
        continue;
      }

      let message;
      try {
        message = JSON.parse(messageString);
      } catch (parseError) {
        logger.warn('Invalid SNS message payload', { error: parseError.message });
        continue;
      }

      if (message.type === 'TASK_ASSIGNED') {
        await handleTaskAssigned(message, logger);
        continue;
      }

      if (message.type === 'TASK_STATUS_CHANGED') {
        await handleStatusChanged(message, logger);
        continue;
      }

      if (message.type === 'TASK_DELETED') {
        await handleTaskDeleted(message, logger);
        continue;
      }

      logger.warn('Unknown notification type', { type: message.type });
    }

    logger.logInvocationEnd(200, Date.now() - startTime);
    return { statusCode: 200 };
  } catch (error) {
    logger.error('Email formatter failed', error);
    logger.logInvocationEnd(500, Date.now() - startTime);
    throw error;
  }
};
