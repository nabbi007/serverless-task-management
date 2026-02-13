const { getItem, query } = require('../utils/dynamodb');
const { getUserEmail, listAdminUserIds, sendEmail } = require('../utils/notifications');
const { validateEnvVars } = require('../utils/validation');
const { createLogger } = require('../utils/logger');

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

  for (const email of recipients) {
    await sendEmail(email, subject, body);
  }

  logger.info('Assignment notifications sent', { taskId, recipients: recipients.size });
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
  ]);

  if (recipients.size === 0) {
    logger.info('No recipients for status change notification', { taskId });
    return;
  }

  const subject = `Task Status Updated: ${task.title || 'Untitled'}`;
  const body = `Task status changed from ${oldStatus} to ${newStatus}.\n\n${formatTaskSummary({
    ...task,
    status: newStatus
  })}`;

  for (const email of recipients) {
    await sendEmail(email, subject, body);
  }

  logger.info('Status change notifications sent', { taskId, recipients: recipients.size });
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
