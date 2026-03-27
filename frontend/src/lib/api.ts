import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Only force logout if:
    // 1. It's a real 401 response (not a network error)
    // 2. It's NOT the login endpoint itself
    // 3. We actually have a token (meaning we were logged in)
    if (
      error.response?.status === 401 &&
      !error.config?.url?.includes('/auth/login') &&
      useAuthStore.getState().token
    ) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
