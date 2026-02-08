import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import ErrorBoundary from './ErrorBoundary';
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
  .filter(([key, value]) => !value || value.trim() === '')
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('Missing or empty required environment variables:', missingVars);
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(
    <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#fff3cd', minHeight: '100vh' }}>
      <h1>⚠️ Configuration Error</h1>
      <p style={{ fontSize: '18px', color: '#856404' }}>
        Missing or empty environment variables: <strong>{missingVars.join(', ')}</strong>
      </p>
      <p>Please check the Amplify Console environment variables configuration.</p>
      <details style={{ marginTop: '20px', textAlign: 'left', maxWidth: '600px', margin: '20px auto' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>View all environment variables</summary>
        <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '5px', marginTop: '10px' }}>
          {JSON.stringify(requiredEnvVars, null, 2)}
        </pre>
      </details>
    </div>
  );
} else {
  // Configure Amplify
  try {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId: process.env.REACT_APP_USER_POOL_ID,
          userPoolClientId: process.env.REACT_APP_USER_POOL_CLIENT_ID,
          signUpVerificationMethod: 'code',
          loginWith: {
            email: true
          }
        }
      },
      API: {
        REST: {
          TaskManagementAPI: {
            endpoint: process.env.REACT_APP_API_ENDPOINT,
            region: process.env.REACT_APP_AWS_REGION
          }
        }
      }
    });

    console.log('Amplify configured successfully');

    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
  } catch (error) {
    console.error('Error configuring Amplify:', error);
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(
      <div style={{ padding: '40px', textAlign: 'center', backgroundColor: '#f8d7da', minHeight: '100vh' }}>
        <h1>❌ Amplify Configuration Error</h1>
        <p style={{ fontSize: '18px', color: '#721c24' }}>{error.message}</p>
        <pre style={{ textAlign: 'left', backgroundColor: '#fff', padding: '20px', borderRadius: '5px' }}>
          {error.stack}
        </pre>
      </div>
    );
  }
}
