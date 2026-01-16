import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar, Users, Clock, MapPin, Loader2, ArrowRight, Sparkles } from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { getAttendeeDashboard } from '../api';
import { toast } from 'sonner';

interface DashboardData {
  statistics: {
    totalRegistered: number;
    upcomingCount: number;
    waitlistedCount: number;
    nextEvent?: {
      id: number;
      title: string;
      startDate: string;
      venue?: {
        id: number;
        name: string;
      } | null;
    };
  };
  upcomingEvents: Array<{
    id: number;
    title: string;
    startDate: string;
    endDate: string;
    expectedAudience?: number;
    venue?: {
      id: number;
      name: string;
      capacity: number;
    } | null;
  }>;
  todaysSessions: Array<{
    id: number;
    title: string;
    speaker?: string;
    durationMin: number;
    startTime: string | Date;
    topic?: string;
    capacity?: number;
    event: {
      id: number;
      title: string;
      startDate: string;
      endDate: string;
    };
    room?: {
      id: number;
      name: string;
      capacity: number;
    } | null;
  }>;
  recentRegistrations: Array<{
    id: number;
    eventId: number;
    userId: number;
    status: string;
    joinedAt: string;
    event: {
      id: number;
      title: string;
      startDate: string;
      endDate: string;
      venue?: {
        id: number;
        name: string;
      } | null;
    };
  }>;
}

interface AttendeeDashboardProps {
  onNavigate?: (page: string) => void;
}

export function AttendeeDashboard({ onNavigate }: AttendeeDashboardProps = {}) {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data } = await getAttendeeDashboard();
      setDashboardData(data);
    } catch (error: any) {
      toast.error('Failed to load dashboard data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigate = (page: string) => {
    if (onNavigate) {
      onNavigate(page);
    } else {
      // Fallback: could use router if available
      console.log(`Navigate to ${page}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (time: string | Date) => {
    const date = typeof time === 'string' ? new Date(time) : time;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500';
      case 'WAITLISTED':
        return 'bg-yellow-500';
      case 'CANCELLED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2">Attendee Dashboard</h1>
          <p className="text-gray-600">Welcome! Your dashboard is loading...</p>
        </div>
      </div>
    );
  }

  const { statistics, upcomingEvents, todaysSessions, recentRegistrations } = dashboardData;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Attendee Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's an overview of your events and schedule</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Events Registered"
          value={statistics.totalRegistered.toString()}
          icon={Calendar}
          color="#0F6AB4"
          trend={statistics.upcomingCount > 0 ? `${statistics.upcomingCount} upcoming` : 'No upcoming events'}
        />
        <KPICard
          title="Upcoming Events"
          value={statistics.upcomingCount.toString()}
          icon={Calendar}
          color="#28A9A1"
          trend={statistics.totalRegistered > 0 ? `${statistics.totalRegistered - statistics.upcomingCount} past events` : 'No events'}
        />
        <KPICard
          title="Waitlisted Events"
          value={statistics.waitlistedCount.toString()}
          icon={Users}
          color="#F9B233"
          trend={statistics.waitlistedCount > 0 ? 'Waiting for confirmation' : 'All confirmed'}
        />
        <KPICard
          title="Next Event"
          value={statistics.nextEvent ? formatDate(statistics.nextEvent.startDate) : 'None'}
          icon={Clock}
          color="#10B981"
          trend={statistics.nextEvent ? statistics.nextEvent.title : 'No upcoming events'}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          onClick={() => handleNavigate('recommendations')}
          className="h-20 bg-white border-2 border-[#0F6AB4] text-[#0F6AB4] hover:bg-[#0F6AB4] hover:text-white"
        >
          <div className="flex flex-col items-center">
            <Sparkles className="w-6 h-6 mb-1" />
            <span className="text-sm font-medium">Browse All Events</span>
          </div>
        </Button>
        <Button
          onClick={() => handleNavigate('rsvp')}
          className="h-20 bg-white border-2 border-[#28A9A1] text-[#28A9A1] hover:bg-[#28A9A1] hover:text-white"
        >
          <div className="flex flex-col items-center">
            <Calendar className="w-6 h-6 mb-1" />
            <span className="text-sm font-medium">View My Schedule</span>
          </div>
        </Button>
        <Button
          onClick={() => handleNavigate('recommendations')}
          className="h-20 bg-white border-2 border-[#10B981] text-[#10B981] hover:bg-[#10B981] hover:text-white"
        >
          <div className="flex flex-col items-center">
            <Sparkles className="w-6 h-6 mb-1" />
            <span className="text-sm font-medium">Explore Sessions</span>
          </div>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Next Upcoming Events */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Events</CardTitle>
              {upcomingEvents.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigate('rsvp')}
                  className="text-sm"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleNavigate('recommendations')}
                >
                  Browse Events
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingEvents.map((event) => (
                  <Card key={event.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-gray-900 font-medium mb-2">{event.title}</h3>
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {formatDate(event.startDate)}
                                {event.startDate !== event.endDate && ` - ${formatDate(event.endDate)}`}
                              </span>
                            </div>
                            {event.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{event.venue.name}</span>
                              </div>
                            )}
                            {event.expectedAudience && (
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" />
                                <span>{event.expectedAudience} expected attendees</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Today's Schedule</CardTitle>
              {todaysSessions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleNavigate('recommendations')}
                  className="text-sm"
                >
                  View All <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {todaysSessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No sessions scheduled for today</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => handleNavigate('recommendations')}
                >
                  Explore Sessions
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysSessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-gray-900 font-medium mb-2">{session.title}</h3>
                          {session.speaker && (
                            <p className="text-sm text-gray-600 mb-2">{session.speaker}</p>
                          )}
                          <div className="space-y-1 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>{formatTime(session.startTime)}</span>
                              <span className="text-gray-400">•</span>
                              <span>{session.durationMin} min</span>
                            </div>
                            {session.room && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{session.room.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">{session.event.title}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      {recentRegistrations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Registrations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentRegistrations.map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-gray-900">{registration.event.title}</h4>
                      <Badge className={`${getStatusColor(registration.status)} text-white text-xs`}>
                        {registration.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">
                      Registered on {formatDate(registration.joinedAt)}
                    </p>
                    {registration.event.venue && (
                      <p className="text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {registration.event.venue.name}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
