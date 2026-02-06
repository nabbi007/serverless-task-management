import axios from 'axios';
import { fetchAuthSession } from 'aws-amplify/auth';

const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;

const getAuthHeaders = async () => {
  try {
    const session = await fetchAuthSession();
    const token = session.tokens?.idToken?.toString();
    
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  } catch (error) {
    console.error('Error getting auth headers:', error);
    throw error;
  }
};

export const taskAPI = {
  // Get all tasks
  getTasks: async () => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_ENDPOINT}/tasks`, { headers });
    return response.data;
  },

  // Get single task
  getTask: async (taskId) => {
    const headers = await getAuthHeaders();
    const response = await axios.get(`${API_ENDPOINT}/tasks/${taskId}`, { headers });
    return response.data;
  },

  // Create task (admin only)
  createTask: async (taskData) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(`${API_ENDPOINT}/tasks`, taskData, { headers });
    return response.data;
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    const headers = await getAuthHeaders();
    const response = await axios.put(`${API_ENDPOINT}/tasks/${taskId}`, taskData, { headers });
    return response.data;
  },

  // Delete task (admin only)
  deleteTask: async (taskId) => {
    const headers = await getAuthHeaders();
    const response = await axios.delete(`${API_ENDPOINT}/tasks/${taskId}`, { headers });
    return response.data;
  },

  // Assign task (admin only)
  assignTask: async (taskId, userIds) => {
    const headers = await getAuthHeaders();
    const response = await axios.post(
      `${API_ENDPOINT}/tasks/${taskId}/assign`,
      { userIds },
      { headers }
    );
    return response.data;
  }
};
