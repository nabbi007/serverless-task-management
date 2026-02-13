import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { taskAPI } from '../services/api';
import { Edit2, Users, Trash2 } from 'lucide-react';
import AppModal from '../components/AppModal';
import MultiMemberSelect from '../components/MultiMemberSelect';

const TaskDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin, userId, userEmail } = useAuth();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [assigningUsers, setAssigningUsers] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: '',
    message: '',
    variant: 'success',
    autoClose: true,
    autoCloseDelay: 1800,
    onClose: null,
    primaryAction: null,
    secondaryAction: null
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const UPDATED_TASKS_KEY = 'updatedTasks';

  const normalizeTask = (taskData) => {
    if (!taskData) return taskData;
    if (taskData.taskId) return taskData;
    return { ...taskData, taskId: taskData.id || id };
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

  const rememberUpdatedTask = (taskData) => {
    const normalized = normalizeTask(taskData);
    if (!normalized?.taskId) return;
    const updates = getUpdatedTasks();
    updates[normalized.taskId] = {
      ...updates[normalized.taskId],
      ...normalized,
      _clientUpdatedAt: Date.now()
    };
    sessionStorage.setItem(UPDATED_TASKS_KEY, JSON.stringify(updates));
  };

  const removeUpdatedTask = (taskId) => {
    if (!taskId) return;
    const updates = getUpdatedTasks();
    if (!updates[taskId]) return;
    delete updates[taskId];
    sessionStorage.setItem(UPDATED_TASKS_KEY, JSON.stringify(updates));
  };

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

  const rememberDeletedTaskId = (taskId) => {
    if (!taskId) return;
    const existing = getDeletedTaskIds();
    if (existing.includes(taskId)) return;
    sessionStorage.setItem('deletedTaskIds', JSON.stringify([...existing, taskId]));
  };

  const emitTaskDeleted = (taskId) => {
    window.dispatchEvent(new CustomEvent('taskDeleted', { detail: { taskId } }));
  };

  const emitTaskUpdated = (updatedTask) => {
    if (updatedTask) {
      const taskWithId = normalizeTask(updatedTask);
      rememberUpdatedTask(taskWithId);
      window.dispatchEvent(new CustomEvent('taskUpdated', { detail: { task: taskWithId } }));
      return;
    }
    window.dispatchEvent(new Event('taskUpdated'));
  };

  const openModal = (config) => {
    setModalConfig(prev => ({
      ...prev,
      title: config.title || prev.title,
      message: config.message || '',
      variant: config.variant || 'success',
      autoClose: config.autoClose ?? true,
      autoCloseDelay: config.autoCloseDelay ?? 1800,
      onClose: config.onClose || null,
      primaryAction: config.primaryAction || null,
      secondaryAction: config.secondaryAction || null
    }));
    setShowModal(true);
  };

  useEffect(() => {
    loadTask();
    if (isAdmin()) {
      loadUsers();
    }
  }, [id]);

  useEffect(() => {
    if (!showAssignModal) {
      return;
    }
    const alreadyAssigned = getAssignedUserIds(task, users);
    setSelectedUsers(alreadyAssigned);
  }, [showAssignModal, task, users]);

  const loadUsers = async () => {
    try {
      const response = await taskAPI.getUsers();
      const userList = response.data?.users || [];
      setUsers(userList);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadTask = async () => {
    try {
      setLoading(true);
      const response = await taskAPI.getTask(id);
      console.log('TaskDetail: getTask response:', response);
      const taskData = normalizeTask(response.data);
      console.log('TaskDetail: Task data:', taskData);
      setTask(taskData);
      setFormData(taskData);
      return taskData;
    } catch (error) {
      console.error('Error loading task:', error);
      console.error('Error response:', error.response?.data);
      if (error.response?.status === 404) {
        rememberDeletedTaskId(id);
        emitTaskDeleted(id);
        emitTaskUpdated();
        alert('Task not found. It may have been deleted.');
        navigate('/', { replace: true });
        return;
      }
      alert('Failed to load task: ' + (error.response?.data?.message || error.message));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const updatePayload = isAdmin()
        ? formData
        : { status: formData.status };
      const response = await taskAPI.updateTask(id, updatePayload);
      const updatedFromResponse = normalizeTask(response?.data?.task || response?.data || response?.task);
      openModal({
        title: 'Task updated',
        message: 'Your changes have been saved.',
        variant: 'success',
        autoClose: true,
        autoCloseDelay: 1600
      });
      setEditing(false);
      const refreshedTask = await loadTask(); // Reload task to get updated data
      const fallbackTask = normalizeTask({ ...task, ...updatePayload });
      const finalTask = refreshedTask || updatedFromResponse || fallbackTask;
      // Trigger a refresh event for dashboard
      emitTaskUpdated(finalTask);
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task: ' + (error.response?.data?.message || error.message));
    }
  };

  const handleAssignUsers = async () => {
    if (selectedUsers.length === 0) {
      alert('Please select at least one user');
      return;
    }

    setAssigningUsers(true);
    try {
      const alreadyAssigned = new Set(getAssignedUserIds(task, users));
      const newUserIds = selectedUsers.filter(userId => !alreadyAssigned.has(userId));

      if (newUserIds.length === 0) {
        alert('All selected users are already assigned to this task.');
        return;
      }

      await taskAPI.assignTask(id, newUserIds);
      alert(`Task assigned to ${newUserIds.length} new user(s) successfully!`);
      setShowAssignModal(false);
      setSelectedUsers([]);
      const refreshedTask = await loadTask();
      emitTaskUpdated(refreshedTask);
    } catch (error) {
      console.error('Error assigning users:', error);
      alert('Failed to assign users: ' + (error.response?.data?.message || error.message));
    } finally {
      setAssigningUsers(false);
    }
  };

  const getAssignedUserIds = (taskData, availableUsers) => {
    if (!taskData || !Array.isArray(taskData.assignedUsers)) {
      return [];
    }

    const emailToId = new Map(
      (availableUsers || []).map(user => [user.email, user.userId])
    );
    const result = new Set();

    taskData.assignedUsers.forEach((assignedUser) => {
      if (!assignedUser) return;

      if (typeof assignedUser === 'string') {
        const mappedId = emailToId.get(assignedUser);
        if (mappedId) {
          result.add(mappedId);
        }
        return;
      }

      if (assignedUser.userId) {
        result.add(assignedUser.userId);
        return;
      }

      if (assignedUser.userEmail) {
        const mappedId = emailToId.get(assignedUser.userEmail);
        if (mappedId) {
          result.add(mappedId);
        }
      }
    });

    return Array.from(result);
  };

  const assignableUsers = users.filter(
    user => user.role !== 'admin' && user.enabled !== false && user.status === 'CONFIRMED'
  );
  const assignedUserIdSet = new Set(getAssignedUserIds(task, users));
  const newSelectionCount = selectedUsers.filter(userId => !assignedUserIdSet.has(userId)).length;

  const handleDelete = async () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await taskAPI.deleteTask(id);
      // Set flag for dashboard to reload
      sessionStorage.setItem('taskDeletedSuccess', 'true');
      // Also dispatch event for other components
      emitTaskUpdated();
      rememberDeletedTaskId(id);
      removeUpdatedTask(id);
      emitTaskDeleted(id);
      openModal({
        title: 'Task deleted',
        message: 'The task has been deleted successfully.',
        variant: 'success',
        autoClose: true,
        autoCloseDelay: 1600,
        onClose: () => navigate('/', { replace: true })
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Failed to delete task: ' + (error.response?.data?.message || error.message));
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  // Check if current user can edit this task
  const canEditTask = () => {
    if (isAdmin()) return true;
    if (!task || !task.assignedUsers) return false;
    
    // Check if current user is assigned to this task
    return task.assignedUsers.some(assignedUser => {
      if (typeof assignedUser === 'string') {
        return assignedUser === userId || assignedUser === userEmail;
      }
      return assignedUser.userId === userId || assignedUser.userEmail === userEmail;
    });
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
              {canEditTask() && (
                <button onClick={() => setEditing(true)} className="btn btn-secondary">
                  <Edit2 size={18} /> {isAdmin() ? 'Edit' : 'Update Status'}
                </button>
              )}
              {isAdmin() && (
                <>
                  <button onClick={() => setShowAssignModal(true)} className="btn btn-primary">
                    <Users size={18} /> Assign
                  </button>
                  <button onClick={handleDelete} className="btn btn-danger">
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {editing ? (
        <form onSubmit={handleUpdate} className="task-form">
          {isAdmin() ? (
            <>
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
            </>
          ) : (
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
          )}

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
              <div className="assigned-users-list">
                {task.assignedUsers.map((user, index) => (
                  <div key={index} className="assigned-user-card">
                    <div className="user-avatar">
                      {(typeof user === 'string'
                        ? user
                        : (user.userEmail || user.userId || '')
                      ).substring(0, 2).toUpperCase() || '??'}
                    </div>
                    <div className="user-info">
                      <div className="user-email">
                        {typeof user === 'string' ? user : (user.userEmail || user.userId)}
                      </div>
                      {user.assignedAt && (
                        <div className="user-assigned-date">
                          Assigned {new Date(user.assignedAt).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Assign Users Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Assign Users to Task</h3>
              <button className="modal-close" onClick={() => setShowAssignModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <p>Select users to assign to this task:</p>
              {assignableUsers.length === 0 ? (
                <div className="member-multiselect-empty">No members available for assignment.</div>
              ) : (
                <MultiMemberSelect
                  users={assignableUsers}
                  selectedUserIds={selectedUsers}
                  onChange={setSelectedUsers}
                  placeholder="Select one or more members"
                />
              )}
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-primary" 
                onClick={handleAssignUsers}
                disabled={assigningUsers || newSelectionCount === 0}
              >
                {assigningUsers ? 'Assigning...' : `Assign ${newSelectionCount} User(s)`}
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => {
                  setShowAssignModal(false);
                  setSelectedUsers([]);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <AppModal
        open={showModal}
        title={modalConfig.title}
        message={modalConfig.message}
        variant={modalConfig.variant}
        autoClose={modalConfig.autoClose}
        autoCloseDelay={modalConfig.autoCloseDelay}
        primaryAction={modalConfig.primaryAction}
        secondaryAction={modalConfig.secondaryAction}
        onClose={() => {
          setShowModal(false);
          if (modalConfig.onClose) {
            modalConfig.onClose();
          }
        }}
      />

      <AppModal
        open={showDeleteConfirm}
        title="Delete task?"
        message="This action cannot be undone. The task will be permanently removed."
        variant="danger"
        primaryAction={{ label: 'Delete task', onClick: confirmDelete }}
        secondaryAction={{ label: 'Cancel', onClick: () => setShowDeleteConfirm(false) }}
        onClose={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};

export default TaskDetail;

