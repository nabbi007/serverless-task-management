const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require('@aws-sdk/client-cognito-identity-provider');

const sesClient = new SESClient({});
const cognitoClient = new CognitoIdentityProviderClient({});

const getUserEmail = async (userId) => {
  try {
    const command = new AdminGetUserCommand({
      UserPoolId: process.env.USER_POOL_ID,
      Username: userId
    });
    
    const response = await cognitoClient.send(command);
    const emailAttr = response.UserAttributes.find(attr => attr.Name === 'email');
    return emailAttr ? emailAttr.Value : null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

const sendTaskAssignmentNotification = async (task, assignedUserIds) => {
  try {
    const emails = await Promise.all(
      assignedUserIds.map(userId => getUserEmail(userId))
    );
    
    const validEmails = emails.filter(email => email !== null);
    
    for (const email of validEmails) {
      await sendEmail(
        email,
        'New Task Assignment',
        `You have been assigned to task: ${task.title}\n\nDescription: ${task.description}\n\nStatus: ${task.status}`
      );
    }
    
    console.log(`Assignment notifications sent for task ${task.taskId} to ${validEmails.length} users`);
  } catch (error) {
    console.error('Error sending assignment notification:', error);
  }
};

const sendTaskStatusChangeNotification = async (task, oldStatus, newStatus, assignedUserIds) => {
  try {
    const emails = await Promise.all(
      assignedUserIds.map(userId => getUserEmail(userId))
    );
    
    const validEmails = emails.filter(email => email !== null);
    
    for (const email of validEmails) {
      await sendEmail(
        email,
        'Task Status Updated',
        `Task "${task.title}" status changed from ${oldStatus} to ${newStatus}\n\nDescription: ${task.description}`
      );
    }
    
    console.log(`Status change notifications sent for task ${task.taskId} to ${validEmails.length} users`);
  } catch (error) {
    console.error('Error sending status change notification:', error);
  }
};

const sendEmail = async (to, subject, body) => {
  const params = {
    Source: process.env.SES_FROM_EMAIL || 'noreply@example.com',
    Destination: {
      ToAddresses: [to]
    },
    Message: {
      Subject: {
        Data: subject
      },
      Body: {
        Text: {
          Data: body
        }
      }
    }
  };
  
  const command = new SendEmailCommand(params);
  await sesClient.send(command);
};

module.exports = {
  getUserEmail,
  sendTaskAssignmentNotification,
  sendTaskStatusChangeNotification,
  sendEmail
};
