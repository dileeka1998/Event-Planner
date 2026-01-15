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
export const signup = (data: { email: string; name: string; password: string }) =>
  api.post('/auth/signup', data);

export const login = (data: { email: string; password: string }) =>
  api.post('/auth/login', data);
//Forgot Passwrod
export const forgotPassword = (data: { email: string }) =>
  api.post('/auth/forgot-password', data);

export const resetPassword = (data: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) =>
  api.post('/auth/reset-password', data);

// Events
export const getEvents = () => api.get('/events');

export const getEvent = (id: number) => api.get(`/events/${id}`);

export const createEvent = (data: {
  organizerId: number;
  title: string;
  startDate: string;
  endDate: string;
  expectedAudience?: number;
  budget?: string;
  venueId?: number;
  brief?: string;
  budgetItems?: Array<{
    category: string;
    description?: string;
    estimatedAmount: string;
    actualAmount?: string;
    quantity?: number;
    unit?: string;
    vendor?: string;
  }>;
}) => api.post('/events', data);

// Venues
export const getVenues = () => api.get('/venues');

export const getVenue = (id: number) => api.get(`/venues/${id}`);

export const createVenue = (data: {
  name: string;
  address: string;
  capacity: number;
  contactName?: string;
  contactPhone?: string;
  hourlyRate?: string;
  notes?: string;
}) => api.post('/venues', data);

export const updateVenue = (id: number, data: Partial<{
  name: string;
  address: string;
  capacity: number;
  contactName?: string;
  contactPhone?: string;
  hourlyRate?: string;
  notes?: string;
}>) => api.put(`/venues/${id}`, data);

export const deleteVenue = (id: number) => api.delete(`/venues/${id}`);

// Attendees
export const getEventAttendees = (eventId: number) => api.get(`/events/${eventId}/attendees`);

export const registerAttendee = (eventId: number) => api.post(`/events/${eventId}/attendees`);

export const leaveEvent = (eventId: number) => api.delete(`/events/${eventId}/attendees/me`);

// Users (for admin panel)
export const getUsers = () => api.get('/users');

// Admin
export const deleteUser = (id: number) => api.delete(`/admin/users/${id}`);

// AI
export const parseBrief = (data: { text: string }) => aiApi.post('/parse-brief', data);

export default api;

