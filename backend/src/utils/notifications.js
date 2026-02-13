const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
const { CognitoIdentityProviderClient, AdminGetUserCommand, ListUsersCommand, ListUsersInGroupCommand } = require('@aws-sdk/client-cognito-identity-provider');

const sesClient = new SESClient({});
const cognitoClient = new CognitoIdentityProviderClient({});

const getUserEmail = async (userId) => {
  try {
    if (userId && userId.includes('@')) {
      return userId;
    }

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

const listAdminUserIds = async () => {
  try {
    if (!process.env.USER_POOL_ID) {
      console.warn('USER_POOL_ID not set - cannot list admin users');
      return [];
    }

    const adminUserIds = new Set();
    let paginationToken = undefined;

    // Cognito ListUsers does not reliably support filtering on custom attributes in all setups.
    // Read users page by page and evaluate custom:role client-side.
    do {
      const command = new ListUsersCommand({
        UserPoolId: process.env.USER_POOL_ID,
        PaginationToken: paginationToken
      });

      const response = await cognitoClient.send(command);
      const users = response.Users || [];
      users.forEach(user => {
        const role = user.Attributes?.find(attr => attr.Name === 'custom:role')?.Value;
        if (role === 'admin') {
          adminUserIds.add(user.Username);
        }
      });
      paginationToken = response.PaginationToken;
    } while (paginationToken);

    const groupNames = ['admin', 'Admins'];
    for (const groupName of groupNames) {
      let groupToken = undefined;
      do {
        try {
          const groupCommand = new ListUsersInGroupCommand({
            UserPoolId: process.env.USER_POOL_ID,
            GroupName: groupName,
            NextToken: groupToken
          });

          const groupResponse = await cognitoClient.send(groupCommand);
          const groupUsers = groupResponse.Users || [];
          groupUsers.forEach(user => adminUserIds.add(user.Username));
          groupToken = groupResponse.NextToken;
        } catch (groupError) {
          console.warn(`Error listing users in group ${groupName}:`, groupError.message);
          groupToken = undefined;
        }
      } while (groupToken);
    }

    return Array.from(adminUserIds);
  } catch (error) {
    console.error('Error listing admin users:', error);
    return [];
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
  listAdminUserIds,
  sendEmail
};
