const getUserFromEvent = (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  
  if (!claims) {
    throw new Error('No authorization claims found');
  }

  const cognitoUsername = claims['cognito:username'];
  const sub = claims.sub;
  const email = claims.email;
  
  return {
    // Use Cognito username for data consistency (assignments store Username).
    userId: cognitoUsername || sub,
    cognitoUsername: cognitoUsername || null,
    sub: sub || null,
    email,
    role: claims['custom:role'] || 'member',
    groups: claims['cognito:groups'] ? claims['cognito:groups'].split(',') : []
  };
};

const userIdentityMatches = (candidate, user) => {
  if (!candidate || !user) return false;
  return candidate === user.userId ||
    candidate === user.cognitoUsername ||
    candidate === user.sub ||
    candidate === user.email;
};

const isAdmin = (user) => {
  return user.role === 'admin' || 
         user.groups.includes('admin') || 
         user.groups.includes('Admins');
};

const isMember = (user) => {
  return user.role === 'member' || user.groups.includes('member');
};

const requireAdmin = (user) => {
  if (!isAdmin(user)) {
    throw new Error('Admin access required');
  }
};

const canAccessTask = (user, task) => {
  if (isAdmin(user)) {
    return true;
  }
  
  // Members can only access tasks assigned to them
  if (task.assignedTo && userIdentityMatches(task.assignedTo, user)) {
    return true;
  }

  if (!task.assignedUsers || task.assignedUsers.length === 0) {
    return false;
  }
  
  // Handle both array of strings and array of objects
  return task.assignedUsers.some(assignedUser => {
    if (typeof assignedUser === 'string') {
      return userIdentityMatches(assignedUser, user);
    }
    return userIdentityMatches(assignedUser.userId, user) || userIdentityMatches(assignedUser.userEmail, user);
  });
};

const canUpdateTask = (user, task) => {
  if (isAdmin(user)) {
    return true;
  }
  
  // Members can update tasks assigned to them
  if (task.assignedTo && userIdentityMatches(task.assignedTo, user)) {
    return true;
  }

  if (!task.assignedUsers || task.assignedUsers.length === 0) {
    return false;
  }
  
  // Handle both array of strings and array of objects
  return task.assignedUsers.some(assignedUser => {
    if (typeof assignedUser === 'string') {
      return userIdentityMatches(assignedUser, user);
    }
    return userIdentityMatches(assignedUser.userId, user) || userIdentityMatches(assignedUser.userEmail, user);
  });
};

module.exports = {
  getUserFromEvent,
  isAdmin,
  isMember,
  requireAdmin,
  canAccessTask,
  canUpdateTask
};
