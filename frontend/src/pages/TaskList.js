import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const TaskList = () => {
  const navigate = useNavigate();
  const { isAdmin, userEmail } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const tasksPerPage = 6;
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
        return next;
      }
      const index = prev.findIndex(task => (task.taskId || task.id) === updatedTaskId);
      if (index === -1) {
        return prev;
      }
      found = true;
      const next = [...prev];
      next[index] = { ...prev[index], ...updatedTask };
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
    
    // Check if task was just deleted - reload tasks
    const taskDeleted = sessionStorage.getItem('taskDeletedSuccess');
    if (taskDeleted === 'true') {
      sessionStorage.removeItem('taskDeletedSuccess');
      setTimeout(() => loadTasks(), 100);
    }
    
    // Listen for task updates
    const handleTaskUpdate = (event) => {
      const updatedTask = event.detail?.task;
      if (updatedTask && updatedTask.taskId) {
        const applied = applyTaskUpdate(updatedTask);
        if (!applied) {
          console.log('TaskList: Task updated, reloading...');
          loadTasks();
        }
        return;
      }
      console.log('TaskList: Task updated, reloading...');
      loadTasks();
    };

    const handleTaskDeleted = (event) => {
      const deletedId = event.detail?.taskId;
      if (!deletedId) return;
      setTasks(prev => prev.filter(task => task.taskId !== deletedId));
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
    setTasks(prev => prev.filter(task => isTaskAssignedToUser(task, userEmail)));
  }, [userEmail]);

  const loadTasks = async () => {
    try {
      const response = await taskAPI.getTasks();
      const taskList = response.data?.tasks || [];
      const deletedTaskIds = getDeletedTaskIds();
      const filteredTaskList = deletedTaskIds.length === 0
        ? taskList
        : taskList.filter(task => !deletedTaskIds.includes(task.taskId || task.id));
      const mergedTaskList = mergeUpdatedTasks(filteredTaskList);
      const visibleTasks = isAdmin() || !userEmail
        ? mergedTaskList
        : mergedTaskList.filter(task => isTaskAssignedToUser(task, userEmail));
      setTasks(visibleTasks);

      if (deletedTaskIds.length > 0) {
        const remainingDeletedIds = deletedTaskIds.filter(id =>
          taskList.some(task => (task.taskId || task.id) === id)
        );
        if (remainingDeletedIds.length !== deletedTaskIds.length) {
          sessionStorage.setItem('deletedTaskIds', JSON.stringify(remainingDeletedIds));
        }
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
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

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Pagination
  const indexOfLastTask = currentPage * tasksPerPage;
  const indexOfFirstTask = indexOfLastTask - tasksPerPage;
  const currentTasks = filteredTasks.slice(indexOfFirstTask, indexOfLastTask);
  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="tasks-page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Tasks</h1>
          <p className="page-subtitle">{filteredTasks.length} tasks found</p>
        </div>
        {isAdmin() && (
          <button className="btn-create" onClick={() => navigate('/tasks/new')}>
            + New Task
          </button>
        )}
      </div>

      <div className="filters-bar">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <span className="filter-icon">☰</span>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Done</option>
            <option value="closed">Closed</option>
          </select>
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)}>
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </div>
        <div className="sort-options">
          <button className="sort-btn">📅 Date <span className="sort-arrow">↑↓</span></button>
          <button className="sort-btn">⚡ Priority <span className="sort-arrow">↑↓</span></button>
          <button className="sort-btn">📊 Status <span className="sort-arrow">↑↓</span></button>
        </div>
      </div>

      {currentTasks.length === 0 ? (
        <div className="empty-message">No tasks found. Try adjusting your filters.</div>
      ) : (
        <>
          <div className="tasks-grid">
            {currentTasks.map(task => (
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
                    <div className="assignee-avatar">
                      {getInitials(task.assignedTo || task.createdByEmail)}
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

          {totalPages > 1 && (
            <div className="pagination">
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`pagination-number ${currentPage === page ? 'active' : ''}`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button 
                className="pagination-btn"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TaskList;
