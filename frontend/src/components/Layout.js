import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Layout = ({ children, signOut, user }) => {
  const { userRole, isAdmin } = useAuth();

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>Task Management</h1>
        </div>
        <div className="nav-links">
          <Link to="/">Dashboard</Link>
          <Link to="/tasks">Tasks</Link>
          {isAdmin() && <Link to="/tasks/new">Create Task</Link>}
        </div>
        <div className="nav-user">
          <span className="user-info">
            {user?.signInDetails?.loginId} ({userRole})
          </span>
          <button onClick={signOut} className="btn-signout">
            Sign Out
          </button>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  );
};

export default Layout;
