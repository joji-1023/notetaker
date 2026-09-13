import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

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

// Task Operations
export const getTasksByUser = (userId) => api.get(`/tasks/user/${userId}`);
export const createTask = (userId, taskData) => api.post(`/tasks/user/${userId}`, taskData);
export const toggleTaskStatus = (taskId) => api.put(`/tasks/${taskId}/toggle`);
export const deleteTask = (taskId) => api.delete(`/tasks/${taskId}`);

// Note Operations
export const getNotesByUser = (userId) => api.get(`/notes/user/${userId}`);
export const createNote = (userId, noteData) => api.post(`/notes/user/${userId}`, noteData);
export const deleteNote = (noteId, userId) => api.delete(`/notes/${noteId}?userId=${userId}`);

export default api;