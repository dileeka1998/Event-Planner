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
export const signup = (data: { email: string; name: string; password: string; role?: 'ORGANIZER' | 'ATTENDEE' }) =>
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

// Users (for admin dashboard)
export const getUsers = (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.role) queryParams.append('role', params.role);
  const queryString = queryParams.toString();
  return api.get(`/admin/users${queryString ? `?${queryString}` : ''}`);
};

// Admin
export const deleteUser = (id: number) => api.delete(`/admin/users/${id}`);

export const updateUser = (id: number, data: any) =>
  api.patch(`/admin/users/${id}`, data);

// Recommendations
export const getAttendeeDashboard = () => api.get('/attendees/dashboard');

export const getRecommendedSessions = (filters?: { topic?: string; day?: string; track?: string; showAll?: boolean; page?: number; limit?: number }) => {
  const params = new URLSearchParams();
  if (filters?.topic) params.append('topic', filters.topic);
  if (filters?.day) params.append('day', filters.day);
  if (filters?.track) params.append('track', filters.track);
  if (filters?.showAll !== undefined) params.append('showAll', filters.showAll.toString());
  if (filters?.page) params.append('page', filters.page.toString());
  if (filters?.limit) params.append('limit', filters.limit.toString());
  return api.get(`/attendees/recommendations?${params.toString()}`);
};

export const getMySessions = () => api.get('/attendees/my-sessions');

export const getMyRegistrations = () => api.get('/attendees/my-registrations');

export const getAvailableEvents = () => api.get('/attendees/available-events');

// Sessions
export const getEventSessions = (eventId: number) => api.get(`/events/${eventId}/sessions`);

export const createSession = (
  eventId: number,
  data: { title: string; speaker?: string; durationMin: number; startTime?: string; roomId?: number; topic?: string; capacity?: number }
) => api.post(`/events/${eventId}/sessions`, data);

export const updateSession = (
  eventId: number,
  sessionId: number,
  data: Partial<{ title: string; speaker?: string; durationMin: number; startTime?: string; roomId?: number | null; topic?: string; capacity?: number }>
) => api.put(`/events/${eventId}/sessions/${sessionId}`, data);

export const deleteSession = (eventId: number, sessionId: number) =>
  api.delete(`/events/${eventId}/sessions/${sessionId}`);

// Rooms
export const getEventRooms = (eventId: number) => api.get(`/events/${eventId}/rooms`);
export const createRoom = (eventId: number, data: { name: string; capacity: number }) =>
  api.post(`/events/${eventId}/rooms`, data);
export const updateRoom = (eventId: number, roomId: number, data: Partial<{ name: string; capacity: number }>) =>
  api.put(`/events/${eventId}/rooms/${roomId}`, data);
export const deleteRoom = (eventId: number, roomId: number) =>
  api.delete(`/events/${eventId}/rooms/${roomId}`);

// AI
export const parseBrief = (data: { text: string }) => aiApi.post('/parse-brief', data);

// Scheduler
export const generateSchedule = (eventId: number, gapMinutes: number = 0, dryRun: boolean = true, startTime?: string) =>
  api.post(`/events/${eventId}/schedule`, { gapMinutes, dryRun, startTime });

export const applySchedule = (eventId: number, assignments: Array<{ sessionId: number; roomId?: number | null; startTime?: string | null }>) =>
  api.post(`/events/${eventId}/schedule/apply`, { assignments });

// User Profile
export const updateProfile = (data: { name?: string; email?: string }) =>
  api.patch('/users/me', data);

export const changePassword = (data: { currentPassword: string; newPassword: string }) =>
  api.patch('/users/me/password', data);

export default api;

