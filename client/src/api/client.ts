// API client with auth token
import axios from 'axios';

// Prefer Vite's injected env; fallback to localhost for dev
export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

export const api = axios.create({ baseURL: API_BASE });

api.interceptors.request.use((config) => {
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers = { ...(config.headers as any), Authorization: `Bearer ${token}` } as any;
  }
  return config;
});
