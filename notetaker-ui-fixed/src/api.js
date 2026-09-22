import axios from 'axios';

// Fallback directly to live Render URL if VITE_API_URL is missing
const BASE_URL = import.meta.env.VITE_API_URL || 'https://notetaker-fbqn.onrender.com';
const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  // Render's free tier spins the backend down after idling and can take
  // 30-60s to wake back up on the next request. A short timeout here made
  // that first request fail right after login/reload, which upstream code
  // was silently treating as "offline, keep working locally" -- which is
  // why data appeared to vanish. Give cold starts room to finish.
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Automatically retries idempotent (GET) requests once after a short delay.
// This absorbs Render cold-start failures (backend waking up) instead of
// surfacing an empty/blank state to the user.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const isGet = config && (config.method || 'get').toLowerCase() === 'get';
    const isNetworkOrTimeout = !error.response; // no response = timeout/network/cold-start
    if (isGet && isNetworkOrTimeout && !config._retried) {
      config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return api(config);
    }
    return Promise.reject(error);
  }
);

// Authentication Endpoints
export const loginUser = (credentials) => api.post('/auth/login', credentials);
export const registerUser = (userData) => api.post('/auth/register', userData);
export const verifyOtp = (otpData) => api.post('/auth/verify-otp', otpData);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resetPassword = (payload) => api.post('/auth/reset-password', payload);

// Task Operations
export const getTasksByUser = (userId) => api.get(`/tasks/user/${userId}`);
export const createTask = (userId, taskData) => api.post(`/tasks/user/${userId}`, taskData);
export const toggleTaskStatus = (taskId) => api.put(`/tasks/${taskId}/toggle`);
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);

// Note Operations
export const getNotesByUser = (userId) => api.get(`/notes/user/${userId}`);
export const createNote = (userId, noteData) => api.post(`/notes/user/${userId}`, noteData);
export const updateNote = (noteId, userId, noteData) => api.put(`/notes/${noteId}/user/${userId}`, noteData);
export const deleteNote = (noteId, userId) => api.delete(`/notes/${noteId}/user/${userId}`);

// Profile Operations
export const getUserProfile = (userId) => api.get(`/users/${userId}`);
export const updateUserProfile = (userId, payload) => api.put(`/users/${userId}/profile`, payload);

export default api;