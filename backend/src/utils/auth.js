const getUserFromEvent = (event) => {
  const claims = event.requestContext?.authorizer?.claims;
  
  if (!claims) {
    throw new Error('No authorization claims found');
  }
  
  return {
    userId: claims.sub,
    email: claims.email,
    role: claims['custom:role'] || 'member',
    groups: claims['cognito:groups'] ? claims['cognito:groups'].split(',') : []
  };
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
  return task.assignedUsers && task.assignedUsers.includes(user.userId);
};

const canUpdateTask = (user, task) => {
  if (isAdmin(user)) {
    return true;
  }
  
  // Members can update tasks assigned to them
  return task.assignedUsers && task.assignedUsers.includes(user.userId);
};

module.exports = {
  getUserFromEvent,
  isAdmin,
  isMember,
  requireAdmin,
  canAccessTask,
  canUpdateTask
};
