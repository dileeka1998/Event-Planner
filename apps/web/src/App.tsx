
import { useState, useEffect } from 'react';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { LoginPage } from './pages/LoginPage';
import { OrganizerDashboard } from './pages/OrganizerDashboard';
import { EventsPage } from './pages/EventsPage';
import { SpeakersPage } from './pages/SpeakersPage';
import { SchedulerPage } from './pages/SchedulerPage';
import { BudgetPage } from './pages/BudgetPage';
import { RecommendationsPage } from './pages/RecommendationsPage';
import { RSVPPage } from './pages/RSVPPage';
import { AdminPanel } from './pages/AdminPanel';
import { SettingsPage } from './pages/SettingsPage';
import { User } from './types';
import api, { login as apiLogin } from './api';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const { data } = await api.get('/users/me');
          setUser(data);
        } catch (error) {
          console.error("Failed to fetch user", error);
          localStorage.removeItem('token');
        }
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const handleLogin = async (credentials: any) => {
    try {
      const { data } = await apiLogin(credentials);
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setCurrentPage('dashboard');
    } catch (error) {
      console.error('Login failed', error);
      // You might want to show an error to the user
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <div>Loading...</div>; // Or a proper spinner
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        if (user.role === 'ORGANIZER') {
          return <OrganizerDashboard onNavigate={handleNavigate} />;
        }
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-gray-900 mb-2">Welcome back, {user.name}!</h1>
              <p className="text-gray-600">
                {user.role === 'ADMIN'
                  ? 'Access the Admin Panel to manage the system'
                  : 'Explore recommended sessions and manage your schedule'}
              </p>
            </div>
          </div>
        );
      case 'events':
        return <EventsPage user={user} />;
      case 'speakers':
        return <SpeakersPage />;
      case 'scheduler':
        return <SchedulerPage />;
      case 'budget':
        return <BudgetPage />;
      case 'recommendations':
        return <RecommendationsPage />;
      case 'rsvp':
        return <RSVPPage userRole={user.role === 'ATTENDEE' ? 'Attendee' : 'Organizer'} />;
      case 'admin':
        return <AdminPanel />;
      case 'settings':
        return <SettingsPage user={user} />;
      default:
        return <OrganizerDashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <DashboardLayout
      currentPage={currentPage}
      onNavigate={handleNavigate}
      user={user}
      onLogout={handleLogout}
    >
      {renderPage()}
    </DashboardLayout>
  );
}
