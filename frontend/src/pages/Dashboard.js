import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI } from '../services/api';

const Dashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskAPI.getTasks();
      const taskList = response.data?.tasks || [];
      setTasks(taskList);
    } catch (error) {
      console.error('Error loading tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  // Group tasks by time period
  const groupTasksByTime = () => {
    const now = new Date();
    const endOfWeek = new Date(now);
    endOfWeek.setDate(now.getDate() + (7 - now.getDay())); // End of current week
    
    const nextWeekEnd = new Date(endOfWeek);
    nextWeekEnd.setDate(endOfWeek.getDate() + 7); // End of next week

    const thisWeek = [];
    const nextWeek = [];
    const later = [];

    tasks.forEach(task => {
      if (!task.dueDate) {
        later.push(task);
        return;
      }
      
      const dueDate = new Date(task.dueDate);
      if (dueDate <= endOfWeek) {
        thisWeek.push(task);
      } else if (dueDate <= nextWeekEnd) {
        nextWeek.push(task);
      } else {
        later.push(task);
      }
    });

    return { thisWeek, nextWeek, later };
  };

  // Filter tasks based on search and status
  const filterTasks = (taskList) => {
    return taskList.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           task.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  };

  const getStatusLabel = (status) => {
    const labels = {
      'open': 'Open',
      'in-progress': 'Working on it',
      'completed': 'Completed',
      'closed': 'Closed'
    };
    return labels[status] || status;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const day = date.getDate();
    return `${month} ${day}`;
  };

  const renderTaskRow = (task) => (
    <div key={task.taskId} className="table-row" onClick={() => navigate(`/tasks/${task.taskId}`)}>
      <div className="table-cell task-title-cell">
        <div className="task-checkbox">
          <input type="checkbox" onClick={(e) => e.stopPropagation()} />
        </div>
        <span className="task-title-text">{task.title}</span>
      </div>
      <div className="table-cell owner-cell">
        <div className="owner-avatar">
          {task.assignedTo ? task.assignedTo.charAt(0).toUpperCase() : '-'}
        </div>
      </div>
      <div className="table-cell status-cell">
        <span className={`status-pill status-${task.status}`}>
          {getStatusLabel(task.status)}
        </span>
      </div>
      <div className="table-cell date-cell">
        {task.dueDate && (
          <>
            <span className="date-icon">📅</span>
            <span>{formatDate(task.dueDate)}</span>
          </>
        )}
      </div>
      <div className="table-cell priority-cell">
        <span className={`priority-pill priority-${task.priority}`}>
          {task.priority}
        </span>
      </div>
      <div className="table-cell time-cell">
        {task.timeEstimate ? `${task.timeEstimate}h` : '-'}
      </div>
    </div>
  );

  const renderTaskGroup = (title, taskList, color) => {
    if (taskList.length === 0) return null;
    
    const filteredTasks = filterTasks(taskList);
    if (filteredTasks.length === 0) return null;

    const totalTime = filteredTasks.reduce((sum, task) => sum + (task.timeEstimate || 0), 0);

    return (
      <div className="task-group">
        <div className="group-header">
          <div className="group-indicator" style={{ backgroundColor: color }}></div>
          <h3 className="group-title">{title}</h3>
          <span className="group-count">{filteredTasks.length} tasks</span>
        </div>
        <div className="table-body">
          {filteredTasks.map(renderTaskRow)}
        </div>
        <div className="group-footer">
          <span className="group-total">{totalTime}h total</span>
        </div>
      </div>
    );
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  const { thisWeek, nextWeek, later } = groupTasksByTime();

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-title">
          <h1>Team Tasks</h1>
          <p className="dashboard-subtitle">Manage your team's workflow</p>
        </div>
        <div className="dashboard-actions">
          {isAdmin() && (
            <button className="btn-new-item" onClick={() => navigate('/tasks/new')}>
              + New Item
            </button>
          )}
        </div>
      </div>

      <div className="dashboard-toolbar">
        <div className="toolbar-left">
          <button className="view-selector">
            <span>📊 Main Table</span>
            <span className="dropdown-icon">▼</span>
          </button>
        </div>
        <div className="toolbar-right">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search / Filter Board"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-dropdown">
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">Working on it</option>
              <option value="completed">Completed</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>
      </div>

      <div className="task-table">
        <div className="table-header">
          <div className="table-cell task-title-cell"><strong>Task</strong></div>
          <div className="table-cell owner-cell"><strong>Owner</strong></div>
          <div className="table-cell status-cell"><strong>Status</strong></div>
          <div className="table-cell date-cell"><strong>Date</strong></div>
          <div className="table-cell priority-cell"><strong>Priority</strong></div>
          <div className="table-cell time-cell"><strong>Time Est</strong></div>
        </div>

        {renderTaskGroup('This Week', thisWeek, '#0073ea')}
        {renderTaskGroup('Next Week', nextWeek, '#a25ddc')}
        {renderTaskGroup('Later', later, '#c4c4c4')}

        {tasks.length === 0 && (
          <div className="empty-state">
            <p>No tasks yet. {isAdmin() && 'Create your first task to get started!'}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
