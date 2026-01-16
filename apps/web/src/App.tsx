import { useState, useEffect } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
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
  const [currentPage, setCurrentPage] = useState('dashboard');
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
        setCurrentUser({
          id: decoded.sub,
          email: decoded.email,
          name: decoded.name || decoded.email.split('@')[0],
          role: role,
        });
        setIsAuthenticated(true);
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
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('app_token');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setCurrentPage('dashboard');
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
        // For Admin and Attendee, show a simplified dashboard
        console.log('Showing Attendee/Admin Dashboard, role:', userRole);
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-gray-900 mb-2">Welcome back, {currentUser.name}!</h1>
              <p className="text-gray-600">
                {userRole === 'ADMIN' 
                  ? 'Access the Admin Panel to manage the system' 
                  : 'Explore recommended sessions and manage your schedule'}
              </p>
              <p className="text-xs text-gray-400 mt-2">Your role: {currentUser.role}</p>
            </div>
          </div>
        );
      case 'events':
        return <EventsPage />;
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
        return <RecommendationsPage />;
      case 'rsvp':
        return <RSVPPage userRole={currentUser.role === 'ATTENDEE' ? 'Attendee' : 'Organizer'} />;
      case 'admin':
        return <AdminPanel />;
      case 'team':
        return <TeamPage />;
      case 'settings':
        return <SettingsPage user={currentUser} />;
      default:
        // Show appropriate dashboard based on user role
        const defaultRole = (currentUser.role || '').toUpperCase();
        if (defaultRole === 'ORGANIZER') {
          return <OrganizerDashboard onNavigate={handleNavigate} />;
        }
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-gray-900 mb-2">Welcome back, {currentUser.name}!</h1>
              <p className="text-gray-600">
                {defaultRole === 'ADMIN' 
                  ? 'Access the Admin Panel to manage the system' 
                  : 'Explore recommended sessions and manage your schedule'}
              </p>
            </div>
          </div>
        );
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