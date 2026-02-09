import React, { useState, useEffect } from 'react';
import { taskAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Team = () => {
  const { isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    if (!isAdmin()) {
      setError('Only administrators can view team members');
      setLoading(false);
      return;
    }

    try {
      console.log('Fetching users from Cognito...');
      const response = await taskAPI.getUsers();
      console.log('getUsers response:', response);
      
      const userList = response.data?.users || [];
      console.log('Users loaded:', userList);
      setUsers(userList);
      setError(null);
    } catch (error) {
      console.error('Error loading users:', error);
      console.error('Error response:', error.response?.data);
      setError(error.response?.data?.message || 'Failed to load team members');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (email) => {
    if (!email) return '?';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  const getStatusColor = (status) => {
    const colors = {
      'CONFIRMED': '#27ae60',
      'FORCE_CHANGE_PASSWORD': '#f39c12',
      'UNCONFIRMED': '#e74c3c'
    };
    return colors[status] || '#95a5a6';
  };

  const getRoleBadgeClass = (role) => {
    return role === 'Admin' ? 'role-badge role-admin' : 'role-badge role-member';
  };

  if (loading) {
    return (
      <div className="team-page">
        <div className="page-top">
          <div>
            <h1 className="page-title">Team Members</h1>
            <p className="page-subtitle">Loading team members...</p>
          </div>
        </div>
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="team-page">
        <div className="page-top">
          <div>
            <h1 className="page-title">Team Members</h1>
            <p className="page-subtitle">Contact your administrator</p>
          </div>
        </div>
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="team-page">
      <div className="page-top">
        <div>
          <h1 className="page-title">Team Members</h1>
          <p className="page-subtitle">{users.length} member{users.length !== 1 ? 's' : ''} in your team</p>
        </div>
      </div>

      {users.length === 0 ? (
        <div className="empty-message">
          No team members found. Add users to your Cognito User Pool.
        </div>
      ) : (
        <div className="team-grid">
          {users.map(user => (
            <div key={user.userId} className="team-member-card">
              <div className="member-avatar-large">
                {getInitials(user.email)}
              </div>
              <div className="member-info">
                <h3 className="member-name">{user.email}</h3>
                <p className="member-email">{user.userId}</p>
                <div className="member-meta">
                  <span className={getRoleBadgeClass(user.role)}>
                    {user.role || 'Member'}
                  </span>
                  <span 
                    className="member-status-badge"
                    style={{ backgroundColor: getStatusColor(user.status) }}
                  >
                    {user.status}
                  </span>
                  {!user.enabled && (
                    <span className="disabled-badge">Disabled</span>
                  )}
                </div>
                {user.created && (
                  <p className="member-joined">
                    Joined {new Date(user.created).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Team;
