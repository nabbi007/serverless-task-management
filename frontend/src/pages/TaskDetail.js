import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI } from '../services/api';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});

  useEffect(() => {
    loadTask();
  }, [id]);

  const loadTask = async () => {
    try {
      const response = await taskAPI.getTask(id);
      const taskData = response.data?.data || response.data;
      setTask(taskData);
      setFormData(taskData);
    } catch (error) {
      console.error('Error loading task:', error);
      alert('Failed to load task');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await taskAPI.updateTask(id, formData);
      alert('Task updated successfully');
      setEditing(false);
      loadTask();
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    
    try {
      await taskAPI.deleteTask(id);
      alert('Task deleted successfully');
      navigate('/tasks');
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task');
    }
  };

  if (loading) {
    return <div className="loading">Loading task...</div>;
  }

  if (!task) {
    return <div>Task not found</div>;
  }

  return (
    <div className="task-detail">
      <div className="task-detail-header">
        <h2>{editing ? 'Edit Task' : task.title}</h2>
        <div className="task-actions">
          {!editing && (
            <>
              <button onClick={() => setEditing(true)} className="btn btn-secondary">
                Edit
              </button>
              {isAdmin() && (
                <button onClick={handleDelete} className="btn btn-danger">
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleUpdate} className="task-form">
          <div className="form-group">
            <label>Title</label>
            <input
              type="text"
              value={formData.title || ''}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="4"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Status</label>
              <select
                value={formData.status || 'open'}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="form-group">
              <label>Priority</label>
              <select
                value={formData.priority || 'medium'}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              value={formData.dueDate || ''}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setFormData(task);
              }}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="task-details">
          <div className="detail-section">
            <h3>Description</h3>
            <p>{task.description}</p>
          </div>

          <div className="detail-grid">
            <div className="detail-item">
              <label>Status</label>
              <span className={`status-badge status-${task.status}`}>
                {task.status}
              </span>
            </div>

            <div className="detail-item">
              <label>Priority</label>
              <span className={`priority-badge priority-${task.priority}`}>
                {task.priority}
              </span>
            </div>

            <div className="detail-item">
              <label>Created By</label>
              <span>{task.createdByEmail}</span>
            </div>

            <div className="detail-item">
              <label>Created At</label>
              <span>{new Date(task.createdAt).toLocaleString()}</span>
            </div>

            {task.dueDate && (
              <div className="detail-item">
                <label>Due Date</label>
                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
              </div>
            )}

            <div className="detail-item">
              <label>Last Updated</label>
              <span>{new Date(task.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {task.assignedUsers && task.assignedUsers.length > 0 && (
            <div className="detail-section">
              <h3>Assigned Users</h3>
              <ul>
                {task.assignedUsers.map((userId, index) => (
                  <li key={index}>{userId}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskDetail;
