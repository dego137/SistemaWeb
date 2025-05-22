// api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const login = async (data) => {
  const response = await api.post('/auth/login', data);
  return response.data;
};

export const register = async (data) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const getUsers = async () => {
  const response = await api.get('/users/');
  return response.data;
};

export const createUser = async (data) => {
  const response = await api.post('/users/', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/users/${id}`, data);
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

export const updateUserVideo = async (id, url_video) => {
  const response = await api.patch(`/users/${id}/video`, { url_video });
  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get('/users/me');
  return response.data;
};

export const getReports = async () => {
  const response = await api.get('/video/reports');
  return response.data;
};

export const connectToAnalysis = (userId, isRealtime = false) => {
  const ws = new WebSocket(`ws://localhost:8000/video/analyze${isRealtime ? '_realtime' : ''}/${userId}`);
  return ws;
};

export const resetPassword = async (data) => {
  const response = await api.post('/auth/reset-password', data);
  return response.data;
};