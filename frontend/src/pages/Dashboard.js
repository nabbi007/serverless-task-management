import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI } from '../services/api';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    inProgress: 0,
    completed: 0
  });

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      console.log('Dashboard: Loading tasks...');
      const response = await taskAPI.getTasks();
      console.log('Dashboard: getTasks response:', response);
      const taskList = response.data?.tasks || [];
      console.log('Dashboard: Loaded tasks:', taskList.length);
      setTasks(taskList);
      
      // Calculate stats
      setStats({
        total: taskList.length,
        open: taskList.filter(t => t.status === 'open').length,
        inProgress: taskList.filter(t => t.status === 'in-progress').length,
        completed: taskList.filter(t => t.status === 'completed').length
      });
    } catch (error) {
      console.error('Dashboard: Error loading tasks:', error);
      console.error('Dashboard: Error response:', error.response?.data);
      setTasks([]);
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
      )}
    </div>
  );
};

export default Dashboard;
