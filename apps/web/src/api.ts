
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || 'http://localhost:3000',
});

const aiApi = axios.create({
  baseURL: import.meta.env.VITE_AI_BASE || 'http://localhost:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('app_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth
export const signup = (data: any) => api.post('/auth/signup', data);
export const login = (data: any) => api.post('/auth/login', data);

// Events
export const createEvent = (data: any) => api.post('/events', data);
export const getEvents = () => api.get('/events');
export const getEvent = (id: number) => api.get(`/events/${id}`);

// Venues
export const getVenues = () => api.get('/venues');
export const getVenue = (id: number) => api.get(`/venues/${id}`);
export const createVenue = (data: any) => api.post('/venues', data);
export const updateVenue = (id: number, data: any) => api.put(`/venues/${id}`, data);
export const deleteVenue = (id: number) => api.delete(`/venues/${id}`);

// Attendees
export const registerAttendee = (eventId: number) => api.post(`/events/${eventId}/attendees`);
export const leaveEvent = (eventId: number) => api.delete(`/events/${eventId}/attendees/me`);
export const getEventAttendees = (eventId: number) => api.get(`/events/${eventId}/attendees`);

// AI
export const parseBrief = (data: any) => aiApi.post('/parse-brief', data);

export default api;
