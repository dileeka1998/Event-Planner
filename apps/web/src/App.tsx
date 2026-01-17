import { useState, useEffect } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { AttendeeDashboard } from './pages/AttendeeDashboard';
import { EventsPage } from './pages/EventsPage';
import { SpeakersPage } from './pages/SpeakersPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { BudgetPage } from './pages/BudgetPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { RSVPPage } from './pages/RSVPPage';
import { AdminPanel } from './pages/AdminPanel';
import { SettingsPage } from './pages/SettingsPage';
import { VenuesPage } from './pages/VenuesPage';
import { RoomsPage } from './pages/RoomsPage';
import { AttendeesPage } from './pages/AttendeesPage';
import { TeamPage } from './pages/TeamPage';
import { User } from './types';
import { toast } from 'sonner';

// Simple JWT decode (without verification - just for getting user info)
function decodeJWT(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authView, setAuthView] = useState<'login' | 'forgot-password' | 'reset-password'>('login');
  const [resetToken, setResetToken] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('app_token');
    if (token) {
      const decoded = decodeJWT(token);
      if (decoded && decoded.sub && decoded.email) {
        // Create user object from JWT payload
        // Role should always be in JWT - if missing, default to ATTENDEE (safer default)
        const role = decoded.role || 'ATTENDEE';
        console.log('JWT decoded role:', role, 'Full decoded:', decoded);
        const user = {
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          role: role,
        };
        setCurrentUser(user);
        setIsAuthenticated(true);
        // Set default page based on role
        const defaultPage = role === 'ADMIN' ? 'admin' : 
                          role === 'ORGANIZER' ? 'dashboard' : 
                          'dashboard';
        setCurrentPage(defaultPage);
      } else {
        localStorage.removeItem('app_token');
      }
    }
    
    // Check for reset token in URL
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setResetToken(tokenParam);
      setAuthView('reset-password');
    }
    
    setLoading(false);
  }, []);

  const handleLogin = (user: User, token: string) => {
    console.log('Login - User object from backend:', user);
    console.log('Login - User role:', user.role);
    // Always use the user object from backend response (source of truth)
    setCurrentUser(user);
    setIsAuthenticated(true);
    // Set default page based on role
    const defaultPage = user.role === 'ADMIN' ? 'admin' : 
                       user.role === 'ORGANIZER' ? 'dashboard' : 
                       'dashboard';
    setCurrentPage(defaultPage);
  };

  const handleLogout = () => {
    localStorage.removeItem('app_token');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentPage('');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated || !currentUser) {
    if (authView === 'forgot-password') {
      return (
        <ForgotPasswordPage
          onBack={() => setAuthView('login')}
          onResetRequested={(token) => {
            setResetToken(token);
            setAuthView('reset-password');
            // Update URL with token
            window.history.pushState({}, '', `?token=${token}`);
          }}
        />
      );
    }

    if (authView === 'reset-password') {
      return (
        <ResetPasswordPage
          token={resetToken}
          onBack={() => {
            setAuthView('login');
            setResetToken('');
            window.history.pushState({}, '', '/');
          }}
          onPasswordReset={() => {
            setAuthView('login');
            setResetToken('');
            window.history.pushState({}, '', '/');
            toast.success('Password reset successful! Please login with your new password.');
          }}
        />
      );
    }

    return <LoginPage onLogin={handleLogin} onForgotPassword={() => setAuthView('forgot-password')} />;
  }

  const renderPage = () => {
    // Debug: Log current user role
    console.log('renderPage - currentUser.role:', currentUser.role);
    console.log('renderPage - currentUser:', currentUser);
    
    // Normalize role to uppercase for comparison (in case of case mismatch)
    const userRole = (currentUser.role || '').toUpperCase();
    
    switch (currentPage) {
      case 'dashboard':
        if (userRole === 'ORGANIZER') {
          console.log('Showing Organizer Dashboard');
          return <OrganizerDashboard onNavigate={handleNavigate} />;
        }
        if (userRole === 'ATTENDEE') {
          console.log('Showing Attendee Dashboard');
          return <AttendeeDashboard onNavigate={handleNavigate} />;
        }
        // For Admin, redirect to admin dashboard
        return <AdminPanel />;
      case 'events':
        return <EventsPage onNavigate={handleNavigate} />;
      case 'venues':
        return <VenuesPage />;
      case 'rooms':
        return <RoomsPage />;
      case 'speakers':
        return <SpeakersPage />;
      case 'scheduler':
        return <SchedulerPage />;
      case 'budget':
        return <BudgetPage />;
      case 'attendees':
        return <AttendeesPage />;
      case 'recommendations':
        return <RecommendationsPage onNavigate={handleNavigate} />;
      case 'rsvp':
        return <RSVPPage userRole={currentUser.role === 'ATTENDEE' ? 'Attendee' : 'Organizer'} />;
      case 'admin':
        return <AdminPanel />;
      case 'team':
        return <TeamPage />;
      case 'settings':
        return <SettingsPage user={currentUser} />;
      default:
        // Redirect to appropriate default page based on user role
        const defaultRole = (currentUser.role || '').toUpperCase();
        if (defaultRole === 'ADMIN') {
          return <AdminPanel />;
        }
        if (defaultRole === 'ORGANIZER') {
          return <OrganizerDashboard onNavigate={handleNavigate} />;
        }
        // For Attendee, show dashboard
        return <AttendeeDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <DashboardLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      user={currentUser}
      onLogout={handleLogout}
    >
      {renderPage()}
    </DashboardLayout>
  );
}