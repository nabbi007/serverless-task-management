import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { taskAPI } from '../services/api';
import AppModal from '../components/AppModal';

const CreateTask = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    timeEstimate: '',
    assignedTo: ''
  });
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    variant: 'success',
    autoClose: true,
    autoCloseDelay: 1800,
    onClose: null
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      console.log('Fetching users for assignment...');
      const response = await taskAPI.getUsers();
      console.log('getUsers response:', response);
      
      const userList = response.data?.users || [];
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
      // Don't block form submission if users can't be loaded
      setUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Clean up form data - convert empty strings to null
      const cleanedData = {
        title: formData.title,
        description: formData.description,
        priority: formData.priority,
        dueDate: formData.dueDate || null,
        timeEstimate: formData.timeEstimate ? parseFloat(formData.timeEstimate) : null,
        assignedTo: formData.assignedTo || null
      };
      
      console.log('Creating task with data:', cleanedData);
      const response = await taskAPI.createTask(cleanedData);
      console.log('Task created response:', response);

      window.dispatchEvent(new Event('taskUpdated'));
      setModalConfig({
        title: 'Task created',
        message: 'Your task has been created successfully.',
        variant: 'success',
        autoClose: true,
        autoCloseDelay: 1800,
        onClose: () => navigate('/')
      });
      setShowModal(true);
    } catch (error) {
      console.error('Error creating task:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create task. Please try again.';
      alert(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="create-task-page">
      <h2>Create New Task</h2>

      <form onSubmit={handleSubmit} className="task-form">
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Enter task title"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            rows="5"
            placeholder="Enter task description"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="priority">Priority</label>
            <select
              id="priority"
              name="priority"
              value={formData.priority}
              onChange={handleChange}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="dueDate">Due Date</label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="assignedTo">Assigned To</label>
            <select
              id="assignedTo"
              name="assignedTo"
              value={formData.assignedTo}
              onChange={handleChange}
              disabled={loadingUsers}
            >
              <option value="">-- Select User --</option>
              {users.map(user => (
                <option key={user.userId} value={user.email}>
                  {user.email}
                </option>
              ))}
            </select>
            {loadingUsers && <small>Loading users...</small>}
          </div>

          <div className="form-group">
            <label htmlFor="timeEstimate">Time Estimate (hours)</label>
            <input
              type="number"
              id="timeEstimate"
              name="timeEstimate"
              value={formData.timeEstimate}
              onChange={handleChange}
              placeholder="e.g., 2.5"
              step="0.5"
              min="0"
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Task'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>

      <AppModal
        open={showModal}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
        autoClose={modalConfig.autoClose}
        autoCloseDelay={modalConfig.autoCloseDelay}
        onClose={() => {
          setShowModal(false);
          if (modalConfig.onClose) {
            modalConfig.onClose();
          }
        }}
      />
    </div>
  );
};

export default CreateTask;
