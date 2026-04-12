// src/api/auth.js
import client from './client';

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }),
  me: () => client.get('/auth/me'),
  register: (data) => client.post('/auth/register', data),
  changePassword: (data) => client.post('/auth/change-password', data),

  // Convenience helpers for local storage
  saveSession: ({ token, user }) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
  },
  clearSession: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
  },
  getStoredUser: () => {
    try { return JSON.parse(localStorage.getItem('auth_user')); }
    catch { return null; }
  },
  isLoggedIn: () => !!localStorage.getItem('auth_token'),
};
