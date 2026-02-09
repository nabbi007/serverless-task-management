import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, ListTodo, Users, LogOut, Bell } from 'lucide-react';

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
            <div className="logo-icon">D</div>
            <div className="logo-text">
              <div className="logo-title">DevOps</div>
              <div className="logo-subtitle">Task Management System</div>
            </div>
          </div>
        </div>
        <div className="header-right">
          <button className="notification-btn">
            <Bell size={20} />
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
              <LayoutDashboard className="sidebar-icon" size={18} />
              <span className="sidebar-label">Dashboard</span>
            </Link>
            <Link 
              to="/tasks" 
              className={`sidebar-item ${isActive('/tasks') || location.pathname.startsWith('/tasks') ? 'active' : ''}`}
            >
              <ListTodo className="sidebar-icon" size={18} />
              <span className="sidebar-label">Tasks</span>
            </Link>
            {isAdmin() && (
              <Link 
                to="/team" 
                className={`sidebar-item ${isActive('/team') ? 'active' : ''}`}
              >
                <Users className="sidebar-icon" size={18} />
                <span className="sidebar-label">Team</span>
              </Link>
            )}
          </nav>

          <div className="sidebar-footer">
            <button onClick={signOut} className="sidebar-user-btn">
              <div className="user-avatar-small">{getInitials(user?.signInDetails?.loginId)}</div>
              <div className="user-details">
                <div className="user-email">{user?.signInDetails?.loginId}</div>
                <div className="user-role">{userRole}</div>
              </div>
              <LogOut size={16} className="signout-icon-inline" />
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
