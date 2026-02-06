import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI } from '../services/api';

const Dashboard = () => {
  const { isAdmin } = useAuth();
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
      const response = await taskAPI.getTasks();
      const taskList = response.data || [];
      setTasks(taskList);
      
      // Calculate stats
      setStats({
        total: taskList.length,
        open: taskList.filter(t => t.status === 'open').length,
        inProgress: taskList.filter(t => t.status === 'in-progress').length,
        completed: taskList.filter(t => t.status === 'completed').length
      });
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Tasks</h3>
          <p className="stat-number">{stats.total}</p>
        </div>
        <div className="stat-card">
          <h3>Open</h3>
          <p className="stat-number">{stats.open}</p>
        </div>
        <div className="stat-card">
          <h3>In Progress</h3>
          <p className="stat-number">{stats.inProgress}</p>
        </div>
        <div className="stat-card">
          <h3>Completed</h3>
          <p className="stat-number">{stats.completed}</p>
        </div>
      </div>

      <div className="recent-tasks">
        <h3>Recent Tasks</h3>
        {tasks.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <div className="task-list">
            {tasks.slice(0, 5).map(task => (
              <Link to={`/tasks/${task.taskId}`} key={task.taskId} className="task-item">
                <div className="task-header">
                  <h4>{task.title}</h4>
                  <span className={`status-badge status-${task.status}`}>
                    {task.status}
                  </span>
                </div>
                <p className="task-description">{task.description}</p>
                <div className="task-meta">
                  <span>Priority: {task.priority}</span>
                  <span>Created: {new Date(task.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isAdmin() && (
        <div className="quick-actions">
          <Link to="/tasks/new" className="btn btn-primary">
            Create New Task
          </Link>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
