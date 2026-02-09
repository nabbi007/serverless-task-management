const { CognitoIdentityProviderClient, ListUsersCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { getUserFromEvent, requireAdmin } = require('../utils/auth');
const { successResponse, errorResponse } = require('../utils/response');
const { validateEnvVars } = require('../utils/validation');

validateEnvVars(['USER_POOL_ID']);

const client = new CognitoIdentityProviderClient({});

exports.handler = async (event) => {
  try {
    const user = getUserFromEvent(event);
    requireAdmin(user);

    const command = new ListUsersCommand({
      UserPoolId: process.env.USER_POOL_ID
    });

    const response = await client.send(command);
    
    const users = response.Users.map(u => {
      const email = u.Attributes.find(a => a.Name === 'email')?.Value;
      const role = u.Attributes.find(a => a.Name === 'custom:role')?.Value || 'member';
      
      return {
        userId: u.Username,
        email,
        role,
        status: u.UserStatus,
        enabled: u.Enabled,
        created: u.UserCreateDate
      };
    });

    return successResponse({ users });
  } catch (error) {
    console.error('Error listing users:', error);
    
    if (error.message === 'Admin access required') {
      return errorResponse(error.message, 403);
    }
    
    return errorResponse('Failed to list users', 500);
  }
};
