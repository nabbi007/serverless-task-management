import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI } from '../services/api';

const Dashboard = () => {
  const { isAdmin, userEmail } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0
  });
  const UPDATED_TASKS_KEY = 'updatedTasks';

  const getDeletedTaskIds = () => {
    try {
      const raw = sessionStorage.getItem('deletedTaskIds');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error reading deleted task IDs:', error);
      return [];
    }
  };

  const getUpdatedTasks = () => {
    try {
      const raw = sessionStorage.getItem(UPDATED_TASKS_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      console.error('Error reading updated tasks:', error);
      return {};
    }
  };

  const saveUpdatedTasks = (updates) => {
    sessionStorage.setItem(UPDATED_TASKS_KEY, JSON.stringify(updates));
  };

  const computeStats = (taskList) => ({
    total: taskList.length,
    open: taskList.filter(t => t.status === 'open').length,
    inProgress: taskList.filter(t => t.status === 'in-progress').length,
    completed: taskList.filter(t => t.status === 'completed').length
  });

  const applyTasks = (taskList) => {
    setTasks(taskList);
    setStats(computeStats(taskList));
  };

  const isTaskAssignedToUser = (task, email) => {
    if (!email || !task) return false;
    if (task.assignedTo && task.assignedTo === email) return true;
    if (!task.assignedUsers || task.assignedUsers.length === 0) return false;

    return task.assignedUsers.some(assignedUser => {
      if (typeof assignedUser === 'string') {
        return assignedUser === email;
      }
      return assignedUser.userEmail === email || assignedUser.userId === email;
    });
  };

  const applyTaskUpdate = (updatedTask) => {
    const updatedTaskId = updatedTask?.taskId || updatedTask?.id;
    if (!updatedTaskId) return false;
    if (getDeletedTaskIds().includes(updatedTaskId)) return true;
    let found = false;
    setTasks(prev => {
      const shouldFilter = !isAdmin() && userEmail;
      const hasAssignmentInfo = updatedTask.assignedUsers || updatedTask.assignedTo;
      if (shouldFilter && hasAssignmentInfo && !isTaskAssignedToUser(updatedTask, userEmail)) {
        const next = prev.filter(task => (task.taskId || task.id) !== updatedTaskId);
        if (next.length !== prev.length) {
          setStats(computeStats(next));
        }
        return next;
      }
      const index = prev.findIndex(task => (task.taskId || task.id) === updatedTaskId);
      if (index === -1) {
        return prev;
      }
      found = true;
      const next = [...prev];
      next[index] = { ...prev[index], ...updatedTask };
      setStats(computeStats(next));
      return next;
    });
    return found;
  };

  const mergeUpdatedTasks = (taskList) => {
    const updates = getUpdatedTasks();
    const updateIds = Object.keys(updates);
    if (updateIds.length === 0) return taskList;

    let changed = false;
    const merged = taskList.map(task => {
      const taskId = task.taskId || task.id;
      const update = updates[taskId];
      if (!update) return task;
      const serverTime = task.updatedAt ? new Date(task.updatedAt).getTime() : 0;
      const updateTime = update.updatedAt
        ? new Date(update.updatedAt).getTime()
        : (update._clientUpdatedAt || 0);

      if (updateTime >= serverTime) {
        return { ...task, ...update };
      }

      delete updates[taskId];
      changed = true;
      return task;
    });

    updateIds.forEach(id => {
      const exists = taskList.some(task => (task.taskId || task.id) === id);
      if (!exists && updates[id]) {
        delete updates[id];
        changed = true;
      }
    });

    if (changed) {
      saveUpdatedTasks(updates);
    }

    return merged;
  };

  useEffect(() => {
    loadTasks();
    
    // Check if task was just created
    const taskCreated = sessionStorage.getItem('taskCreatedSuccess');
    if (taskCreated === 'true') {
      sessionStorage.removeItem('taskCreatedSuccess');
    }
    
    // Check if task was just deleted - reload tasks
    const taskDeleted = sessionStorage.getItem('taskDeletedSuccess');
    if (taskDeleted === 'true') {
      sessionStorage.removeItem('taskDeletedSuccess');
      // Reload tasks to remove deleted task from display
      setTimeout(() => loadTasks(), 100);
    }
    
    // Listen for task updates
    const handleTaskUpdate = (event) => {
      const updatedTask = event.detail?.task;
      if (updatedTask && updatedTask.taskId) {
        const applied = applyTaskUpdate(updatedTask);
        if (!applied) {
          console.log('Dashboard: Task updated, reloading...');
          loadTasks();
        }
        return;
      }
      console.log('Dashboard: Task updated, reloading...');
      loadTasks();
    };

    const handleTaskDeleted = (event) => {
      const deletedId = event.detail?.taskId;
      if (!deletedId) return;
      setTasks(prev => {
        const next = prev.filter(task => task.taskId !== deletedId);
        setStats(computeStats(next));
        return next;
      });
    };
    
    window.addEventListener('taskUpdated', handleTaskUpdate);
    window.addEventListener('taskDeleted', handleTaskDeleted);
    
    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
      window.removeEventListener('taskDeleted', handleTaskDeleted);
    };
  }, []);

  useEffect(() => {
    if (isAdmin() || !userEmail) return;
    setTasks(prev => {
      const next = prev.filter(task => isTaskAssignedToUser(task, userEmail));
      setStats(computeStats(next));
      return next;
    });
  }, [userEmail]);

  const loadTasks = async () => {
    try {
      console.log('Dashboard: Loading tasks...');
      const response = await taskAPI.getTasks();
      console.log('Dashboard: getTasks response:', response);
      const taskList = response.data?.tasks || [];
      const deletedTaskIds = getDeletedTaskIds();
      const filteredTaskList = deletedTaskIds.length === 0
        ? taskList
        : taskList.filter(task => !deletedTaskIds.includes(task.taskId || task.id));
      console.log('Dashboard: Loaded tasks:', taskList.length);
      const mergedTaskList = mergeUpdatedTasks(filteredTaskList);
      const visibleTasks = isAdmin() || !userEmail
        ? mergedTaskList
        : mergedTaskList.filter(task => isTaskAssignedToUser(task, userEmail));
      applyTasks(visibleTasks);

      if (deletedTaskIds.length > 0) {
        const remainingDeletedIds = deletedTaskIds.filter(id =>
          taskList.some(task => (task.taskId || task.id) === id)
        );
        if (remainingDeletedIds.length !== deletedTaskIds.length) {
          sessionStorage.setItem('deletedTaskIds', JSON.stringify(remainingDeletedIds));
        }
      }
    } catch (error) {
      console.error('Dashboard: Error loading tasks:', error);
      console.error('Dashboard: Error response:', error.response?.data);
      
      // Check if it's an authentication error
      if (error.response?.status === 401 || error.response?.status === 403) {
        console.error('Authentication error - token may have expired');
        alert('Your session has expired. Please log in again.');
        // Clear storage and reload
        sessionStorage.clear();
        localStorage.clear();
        window.location.reload();
      } else {
        setTasks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const getStatusClass = (status) => {
    const classes = {
      'open': 'status-open',
      'in-progress': 'status-progress',
      'completed': 'status-done',
      'closed': 'status-closed'
    };
    return classes[status] || 'status-open';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'open': 'Open',
      'in-progress': 'In Progress',
      'completed': 'Done',
      'closed': 'Closed'
    };
    return labels[status] || status;
  };

  const getPriorityClass = (priority) => {
    return `priority-${priority}`;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="tasks-page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your tasks</p>
        </div>
        {isAdmin() && (
          <button className="btn-create" onClick={() => navigate('/tasks/new')}>
            + New Task
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="stats-row">
        <div className="stat-box stat-total">
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Tasks</div>
        </div>
        <div className="stat-box stat-open">
          <div className="stat-value">{stats.open}</div>
          <div className="stat-label">Open</div>
        </div>
        <div className="stat-box stat-progress">
          <div className="stat-value">{stats.inProgress}</div>
          <div className="stat-label">In Progress</div>
        </div>
        <div className="stat-box stat-done">
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="section-header">
        <h2>Recent Tasks</h2>
        <button className="link-btn" onClick={() => navigate('/tasks')}>View All →</button>
      </div>

      {tasks.length === 0 ? (
        <div className="empty-message">No tasks yet. {isAdmin() && 'Create your first task to get started!'}</div>
      ) : (
        <div className="tasks-grid">
          {tasks.slice(0, 6).map(task => (
            <div 
              key={task.taskId} 
              className="task-card-modern"
              onClick={() => navigate(`/tasks/${task.taskId}`)}
            >
              <div className="card-header">
                <h3 className="card-title">{task.title}</h3>
                <span className={`priority-badge-modern ${getPriorityClass(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
              <p className="card-description">{task.description}</p>
              <div className="card-footer">
                <div className="card-meta">
                  <div className="card-assignees">
                    {task.assignedUsers && task.assignedUsers.length > 0 ? (
                      <>
                        <div className="assignee-avatar">
                          {getInitials(task.assignedUsers[0].userEmail || task.assignedUsers[0])}
                        </div>
                        {task.assignedUsers.length > 1 && (
                          <span className="assignee-count">+{task.assignedUsers.length - 1}</span>
                        )}
                      </>
                    ) : (
                      <div className="assignee-avatar">
                        {getInitials(task.createdByEmail)}
                      </div>
                    )}
                  </div>
                  <div className="card-info">
                    <span className="card-date">📅 {formatDate(task.dueDate)}</span>
                    <span className="card-time">⏱️ {task.timeEstimate ? `${task.timeEstimate}h` : 'No estimate'}</span>
                  </div>
                </div>
                <span className={`status-badge-modern ${getStatusClass(task.status)}`}>
                  {getStatusLabel(task.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
      
    </div>
  );
};

export default Dashboard;
