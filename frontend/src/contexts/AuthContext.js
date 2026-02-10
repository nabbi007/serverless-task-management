import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAuthSession } from 'aws-amplify/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children, user }) => {
  const [userRole, setUserRole] = useState('member');
  const [idToken, setIdToken] = useState(null);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUserRole = async () => {
      try {
        const session = await fetchAuthSession();
        const token = session.tokens?.idToken;
        
        if (token) {
          setIdToken(token.toString());
          setUserId(token.payload.sub);
          setUserEmail(token.payload.email || user?.signInDetails?.loginId || null);
          const groups = token.payload['cognito:groups'] || [];
          const customRole = token.payload['custom:role'];
          
          if (groups.includes('Admins') || groups.includes('admin') || customRole === 'admin') {
            setUserRole('admin');
          } else {
            setUserRole('member');
          }
        }
      } catch (error) {
        console.error('Error getting user role:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      getUserRole();
    }
  }, [user]);

  const isAdmin = () => userRole === 'admin';
  const isMember = () => userRole === 'member';

  const value = {
    userId,
    userEmail,
    user,
    userRole,
    idToken,
    isAdmin,
    isMember,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
