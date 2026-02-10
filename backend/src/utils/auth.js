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
  if (task.assignedTo && (task.assignedTo === user.userId || task.assignedTo === user.email)) {
    return true;
  }

  if (!task.assignedUsers || task.assignedUsers.length === 0) {
    return false;
  }
  
  // Handle both array of strings and array of objects
  return task.assignedUsers.some(assignedUser => {
    if (typeof assignedUser === 'string') {
      return assignedUser === user.userId || assignedUser === user.email;
    }
    return assignedUser.userId === user.userId || assignedUser.userEmail === user.email;
  });
};

const canUpdateTask = (user, task) => {
  if (isAdmin(user)) {
    return true;
  }
  
  // Members can update tasks assigned to them
  if (task.assignedTo && (task.assignedTo === user.userId || task.assignedTo === user.email)) {
    return true;
  }

  if (!task.assignedUsers || task.assignedUsers.length === 0) {
    return false;
  }
  
  // Handle both array of strings and array of objects
  return task.assignedUsers.some(assignedUser => {
    if (typeof assignedUser === 'string') {
      return assignedUser === user.userId || assignedUser === user.email;
    }
    return assignedUser.userId === user.userId || assignedUser.userEmail === user.email;
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
