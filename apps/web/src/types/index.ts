export type UserRole = 'Admin' | 'Organizer' | 'Attendee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

export interface Event {
  id: string;
  name: string;
  dateRange: string;
  budget: number;
  expectedAudience: number;
  description: string;
  status: 'Draft' | 'Scheduled' | 'Completed';
  createdAt: string;
}

export interface Session {
  id: string;
  title: string;
  speaker: string;
  track: string;
  duration: number;
  expectedAudience: number;
  time?: string;
  room?: string;
  matchScore?: number;
}

export interface BudgetItem {
  id: string;
  category: 'Room' | 'Resource' | 'Speaker' | 'Other';
  name: string;
  planned: number;
  actual: number;
}

export interface RSVP {
  id: string;
  attendeeName: string;
  sessionId: string;
  status: 'Going' | 'Waitlist' | 'Cancelled';
  email: string;
}

export interface Notification {
  id: string;
  message: string;
  timestamp: string;
  read: boolean;
  type: 'info' | 'warning' | 'success';
}
