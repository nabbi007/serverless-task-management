import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../services/api';

const TaskList = () => {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const response = await taskAPI.getTasks();
      setTasks(response.data?.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

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

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="task-list-page">
      <div className="page-header">
        <h2>All Tasks</h2>
        <div className="filter-buttons">
          <button
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={filter === 'open' ? 'active' : ''}
            onClick={() => setFilter('open')}
          >
            Open
          </button>
          <button
            className={filter === 'in-progress' ? 'active' : ''}
            onClick={() => setFilter('in-progress')}
          >
            In Progress
          </button>
          <button
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      {filteredTasks.length === 0 ? (
        <div className="empty-state">No tasks found.</div>
      ) : (
        <div className="task-table">
          <div className="table-header">
            <div className="table-cell task-title-cell"><strong>Task</strong></div>
            <div className="table-cell owner-cell"><strong>Owner</strong></div>
            <div className="table-cell status-cell"><strong>Status</strong></div>
            <div className="table-cell date-cell"><strong>Date</strong></div>
            <div className="table-cell priority-cell"><strong>Priority</strong></div>
            <div className="table-cell time-cell"><strong>Time Est</strong></div>
          </div>
          <div className="table-body">
            {filteredTasks.map(task => (
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
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
