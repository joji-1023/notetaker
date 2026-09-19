import axios from 'axios';

// Fallback directly to live Render URL if VITE_API_URL is missing
const BASE_URL = import.meta.env.VITE_API_URL || 'https://notetaker-fbqn.onrender.com';
const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL.replace(/\/$/, '')}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
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