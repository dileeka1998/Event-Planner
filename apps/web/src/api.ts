
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
});

const aiApi = axios.create({
  baseURL: import.meta.env.VITE_AI_BASE,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const signup = (data: any) => api.post('/auth/signup', data);
export const login = (data: any) => api.post('/auth/login', data);

export const createEvent = (data: any) => api.post('/events', data);
export const getEvents = () => api.get('/events');

export const parseBrief = (data: any) => aiApi.post('/parse-brief', data);

export default api;
