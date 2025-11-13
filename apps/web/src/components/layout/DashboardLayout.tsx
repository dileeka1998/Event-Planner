import { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { TopNavbar } from './TopNavbar';
import { User } from '../../types';
import { Toaster } from '../ui/sonner';

interface DashboardLayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  user: User;
  onLogout: () => void;
}

export function DashboardLayout({ 
  children, 
  currentPage, 
  onNavigate, 
  user, 
  onLogout 
}: DashboardLayoutProps) {
  // Map backend role enum to Sidebar expected format
  const mapRole = (role: string): 'Admin' | 'Organizer' | 'Attendee' => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'ORGANIZER': return 'Organizer';
      case 'ATTENDEE': return 'Attendee';
      default: return 'Attendee';
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={onNavigate} 
        userRole={mapRole(user.role)}
      />
      <div className="flex-1 flex flex-col">
        <TopNavbar 
          user={user} 
          onNavigate={onNavigate} 
          onLogout={onLogout}
          notificationCount={3}
        />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}