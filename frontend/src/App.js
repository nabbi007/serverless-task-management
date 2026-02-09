import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { AuthProvider } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import TaskList from './pages/TaskList';
import TaskDetail from './pages/TaskDetail';
import CreateTask from './pages/CreateTask';
import Team from './pages/Team';
import Layout from './components/Layout';
import './App.css';

function App() {
  return (
    <Authenticator
      signUpAttributes={['email']}
      loginMechanisms={['email']}
    >
      {({ signOut, user }) => (
        <AuthProvider user={user}>
          <Router>
            <Layout signOut={signOut} user={user}>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/tasks" element={<TaskList />} />
                <Route path="/tasks/:id" element={<TaskDetail />} />
                <Route path="/tasks/new" element={<CreateTask />} />
                <Route path="/team" element={<Team />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </Router>
        </AuthProvider>
      )}
    </Authenticator>
  );
}

export default App;
