export type UserRole = 'ADMIN' | 'ORGANIZER' | 'ATTENDEE';
export type UserRoleDisplay = 'Admin' | 'Organizer' | 'Attendee';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  createdAt?: string;
  avatar?: string;
}

export interface Event {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  budget: string; // Decimal as string
  expectedAudience: number;
  organizer: User;
  venue?: Venue;
  eventBudget?: EventBudget;
  attendees?: EventAttendee[];
  rooms?: Room[];
  sessions?: Session[];
  createdAt?: string;
  // Frontend display helpers
  name?: string; // Alias for title
  dateRange?: string; // Computed from startDate/endDate
  description?: string;
  status?: 'Draft' | 'Scheduled' | 'Completed';
}

export interface EventBudget {
  id: number;
  totalEstimated: string;
  totalActual: string;
  items: BudgetLineItem[];
}

export interface BudgetLineItem {
  id: number;
  category: string;
  description?: string;
  estimatedAmount: string; // Decimal as string
  actualAmount: string; // Decimal as string
  quantity: number;
  unit?: string;
  vendor?: string;
  status: 'PLANNED' | 'APPROVED' | 'PURCHASED' | 'PAID';
  // Frontend display helpers
  estimatedCost?: number; // Parsed from estimatedAmount
  actualCost?: number; // Parsed from actualAmount
}

export interface Session {
  id: number;
  title: string;
  speaker?: string;
  durationMin: number;
  startTime?: string | null;
  event: Event;
  room?: Room | null;
  // Frontend display helpers
  topic?: string;
  dayNumber?: string | null;
  dayOfWeek?: string | null;
  capacity?: number;
  expectedAudience?: number;
  time?: string;
  matchScore?: number;
}

export interface Room {
  id: number;
  name: string;
  capacity: number;
  event: Event;
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  capacity: number;
  hourlyRate?: string; // Decimal as string
  contactName?: string;
  contactPhone?: string;
  notes?: string;
  // Frontend display helpers
  contact?: string; // Computed from contactName/contactPhone
  location?: string; // Extracted from address
  amenities?: string[];
  imageUrl?: string;
}

export interface EventAttendee {
  id: number;
  eventId: number;
  userId: number;
  event: Event;
  user: User;
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
  joinedAt: string;
  // Frontend display helpers
  name?: string; // From user.name
  email?: string; // From user.email
  phone?: string;
}

export interface Attendee {
  id: number;
  name: string;
  email: string;
  eventId: number;
  status: 'CONFIRMED' | 'WAITLISTED' | 'CANCELLED';
  joinedAt: string;
  phone?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  index: string;
  role: string;
  avatar?: string;
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