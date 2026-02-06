import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { Amplify } from 'aws-amplify';

// Validate required environment variables
const requiredEnvVars = {
  REACT_APP_USER_POOL_ID: process.env.REACT_APP_USER_POOL_ID,
  REACT_APP_USER_POOL_CLIENT_ID: process.env.REACT_APP_USER_POOL_CLIENT_ID,
  REACT_APP_AWS_REGION: process.env.REACT_APP_AWS_REGION,
  REACT_APP_API_ENDPOINT: process.env.REACT_APP_API_ENDPOINT
};

console.log('Environment Variables:', requiredEnvVars);

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars);
  alert(`Missing environment variables: ${missingVars.join(', ')}`);
}

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: process.env.REACT_APP_USER_POOL_ID || '',
      userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID || '',
      signUpVerificationMethod: 'code',
      loginWith: {
        email: true
      }
    }
  },
  API: {
    REST: {
      TaskManagementAPI: {
        endpoint: process.env.REACT_APP_API_ENDPOINT || '',
        region: process.env.REACT_APP_AWS_REGION || 'eu-west-1'
      }
    }
  }
});

console.log('Amplify configured successfully');

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
