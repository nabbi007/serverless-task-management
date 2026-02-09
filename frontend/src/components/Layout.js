import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children, signOut, user }) => {
  const { userRole, isAdmin } = useAuth();
  const location = useLocation();

  const getInitials = (email) => {
    if (!email) return 'U';
    const name = email.split('@')[0];
    return name.substring(0, 2).toUpperCase();
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="app-wrapper">
      {/* Top Header */}
      <header className="top-header">
        <div className="header-left">
          <div className="app-logo">
            <div className="logo-icon">A</div>
            <div className="logo-text">
              <div className="logo-title">AmaliTech</div>
              <div className="logo-subtitle">Task Management</div>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="notification-btn">
            <span className="notification-icon">🔔</span>
            <span className="notification-badge">1</span>
          </button>
          <div className="user-menu">
            <div className="user-avatar">{getInitials(user?.signInDetails?.loginId)}</div>
          </div>
        </div>
      </header>

      <div className="app-body">
        {/* Sidebar */}
        <aside className="sidebar">
          <nav className="sidebar-nav">
            <Link 
              to="/" 
              className={`sidebar-item ${isActive('/') ? 'active' : ''}`}
            >
              <span className="sidebar-icon">📊</span>
              <span className="sidebar-label">Dashboard</span>
            </Link>
            <Link 
              to="/tasks" 
              className={`sidebar-item ${isActive('/tasks') || location.pathname.startsWith('/tasks') ? 'active' : ''}`}
            >
              <span className="sidebar-icon">📝</span>
              <span className="sidebar-label">Tasks</span>
            </Link>
            <div className="sidebar-item disabled">
              <span className="sidebar-icon">👥</span>
              <span className="sidebar-label">Team</span>
            </div>
            <div className="sidebar-item disabled">
              <span className="sidebar-icon">⚙️</span>
              <span className="sidebar-label">Settings</span>
            </div>
          </nav>

          <div className="sidebar-footer">
            <div className="sidebar-user">
              <div className="user-avatar-small">{getInitials(user?.signInDetails?.loginId)}</div>
              <div className="user-details">
                <div className="user-email">{user?.signInDetails?.loginId}</div>
                <div className="user-role">{userRole}</div>
              </div>
            </div>
            <button onClick={signOut} className="signout-btn" title="Sign Out">
              🚪
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="main-area">{children}</main>
      </div>
    </div>
  );
};

export default Layout;
