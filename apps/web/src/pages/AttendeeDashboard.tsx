import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar, Users, Clock, MapPin, Loader2, ArrowRight, Sparkles, Grid3x3, List, User } from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { getAttendeeDashboard, getMySessions } from '../api';
import { toast } from 'sonner';
import { Session } from '../types';
import { cn } from '../components/ui/utils';
import { buttonVariants } from '../components/ui/button';

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
  const [scheduleViewMode, setScheduleViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [allSessions, setAllSessions] = useState<Session[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (scheduleViewMode === 'calendar') {
      fetchAllSessions();
    }
  }, [scheduleViewMode]);

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

  const fetchAllSessions = async () => {
    try {
      const { data } = await getMySessions();
      const processedSessions = data.map((s: any) => ({
        ...s,
        time: s.startTime ? new Date(s.startTime).toLocaleTimeString() : undefined,
        room: s.room?.name || null,
      }));
      setAllSessions(processedSessions);
      console.log('Fetched sessions for calendar:', processedSessions.length, processedSessions);
    } catch (error: any) {
      console.error('Failed to fetch all sessions for calendar', error);
      toast.error('Failed to load sessions for calendar');
    }
  };

  const getSessionsForDate = (date: Date) => {
    // Normalize date to local date string (YYYY-MM-DD) for comparison
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    return allSessions.filter(session => {
      if (!session.startTime) return false;
      const sessionDate = new Date(session.startTime);
      const sessionYear = sessionDate.getFullYear();
      const sessionMonth = String(sessionDate.getMonth() + 1).padStart(2, '0');
      const sessionDay = String(sessionDate.getDate()).padStart(2, '0');
      const sessionDateStr = `${sessionYear}-${sessionMonth}-${sessionDay}`;
      return sessionDateStr === dateStr;
    });
  };

  const getDatesWithSessions = () => {
    const dates = new Set<string>();
    allSessions.forEach(session => {
      if (session.startTime) {
        const sessionDate = new Date(session.startTime);
        const year = sessionDate.getFullYear();
        const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
        const day = String(sessionDate.getDate()).padStart(2, '0');
        dates.add(`${year}-${month}-${day}`);
      }
    });
    return Array.from(dates).map(dateStr => {
      const [year, month, day] = dateStr.split('-').map(Number);
      return new Date(year, month - 1, day);
    });
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
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
        <Card className="flex flex-col max-h-[800px]">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle>Today's Schedule</CardTitle>
              <div className="flex items-center gap-2">
                <div className="flex gap-1 border rounded-md p-1">
                  <Button
                    variant={scheduleViewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setScheduleViewMode('list')}
                    className="h-7"
                  >
                    <List className="w-3 h-3" />
                  </Button>
                  <Button
                    variant={scheduleViewMode === 'calendar' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setScheduleViewMode('calendar')}
                    className="h-7"
                  >
                    <Grid3x3 className="w-3 h-3" />
                  </Button>
                </div>
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
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden pb-4">
            {scheduleViewMode === 'calendar' ? (
              <div className="flex flex-col h-full space-y-4 min-h-0">
                {/* Calendar Section */}
                <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-xl p-4 border border-gray-200 flex-shrink-0">
                  <div className="flex justify-center">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        console.log('Date selected:', date);
                        if (date) {
                          setSelectedDate(date);
                        }
                      }}
                      className="rounded-lg bg-white shadow-sm border border-gray-200 p-3"
                      classNames={{
                        caption: "flex justify-center pt-1 relative items-center mb-3",
                        caption_label: "text-base font-semibold text-gray-900",
                        nav: "flex items-center gap-1",
                        nav_button: cn(
                          buttonVariants({ variant: "outline" }),
                          "h-7 w-7 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                        ),
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        head_row: "flex mb-2",
                        head_cell: "text-gray-600 rounded-md w-10 font-semibold text-xs uppercase tracking-wide",
                        row: "flex w-full mt-1",
                        cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                        day: cn(
                          buttonVariants({ variant: "ghost" }),
                          "h-10 w-10 p-0 font-normal hover:bg-gray-100 rounded-lg transition-colors"
                        ),
                        day_selected: "bg-[#0F6AB4] text-white hover:bg-[#0D5A9A] hover:text-white focus:bg-[#0F6AB4] focus:text-white font-semibold",
                        day_today: "bg-[#28A9A1]/10 text-[#28A9A1] font-semibold border border-[#28A9A1]/30",
                      }}
                      modifiers={{
                        hasSessions: getDatesWithSessions(),
                      }}
                      modifiersClassNames={{
                        hasSessions: 'bg-[#28A9A1]/15 border-[#28A9A1] border-2 rounded-lg font-semibold text-[#28A9A1] hover:bg-[#28A9A1]/25',
                      }}
                    />
                  </div>
                </div>

                {/* Sessions Section */}
                {selectedDate && (
                  <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
                    <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200 flex-shrink-0">
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] flex items-center justify-center">
                        <Calendar className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h4>
                        <p className="text-sm text-gray-500">
                          {selectedDate.toLocaleDateString('en-US', { year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex-1 overflow-y-auto min-h-0 pr-2 -mr-2" style={{ maxHeight: '400px' }}>
                      {(() => {
                        const sessionsOnDate = getSessionsForDate(selectedDate);
                        console.log('Sessions for selected date:', selectedDate, sessionsOnDate);
                        
                        if (sessionsOnDate.length === 0) {
                          return (
                            <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
                              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                <Clock className="w-8 h-8 text-gray-400" />
                              </div>
                              <h5 className="text-sm font-medium text-gray-900 mb-1">No sessions scheduled</h5>
                              <p className="text-sm text-gray-500">There are no sessions scheduled for this date</p>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-gray-700">
                                {sessionsOnDate.length} {sessionsOnDate.length === 1 ? 'session' : 'sessions'} scheduled
                              </p>
                            </div>
                            {sessionsOnDate
                              .sort((a, b) => {
                                const timeA = a.startTime ? new Date(a.startTime).getTime() : 0;
                                const timeB = b.startTime ? new Date(b.startTime).getTime() : 0;
                                return timeA - timeB;
                              })
                              .map((session, index) => (
                              <div 
                                key={session.id} 
                                className="group relative p-4 bg-white rounded-xl border border-gray-200 hover:border-[#28A9A1] hover:shadow-md transition-all duration-200"
                              >
                                <div className="flex items-start gap-4">
                                  {/* Time Badge */}
                                  <div className="flex-shrink-0">
                                    <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] text-white">
                                      <span className="text-xs font-medium opacity-90">
                                        {session.startTime ? formatTime(session.startTime).split(' ')[0] : 'TBD'}
                                      </span>
                                      <span className="text-[10px] opacity-75">
                                        {session.startTime ? formatTime(session.startTime).split(' ')[1] : ''}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Session Details */}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                      <h5 className="text-base font-semibold text-gray-900 group-hover:text-[#0F6AB4] transition-colors">
                                        {session.title}
                                      </h5>
                                    </div>
                                    
                                    {session.speaker && (
                                      <div className="flex items-center gap-1.5 mb-3">
                                        <User className="w-3.5 h-3.5 text-gray-400" />
                                        <p className="text-sm text-gray-600">{session.speaker}</p>
                                      </div>
                                    )}
                                    
                                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
                                      {session.room && (
                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md">
                                          <MapPin className="w-3.5 h-3.5 text-[#28A9A1]" />
                                          <span className="font-medium">{session.room}</span>
                                        </div>
                                      )}
                                      <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md">
                                        <Clock className="w-3.5 h-3.5 text-[#0F6AB4]" />
                                        <span className="font-medium">{session.durationMin} min</span>
                                      </div>
                                      {session.topic && (
                                        <div className="px-2 py-1 bg-[#28A9A1]/10 text-[#28A9A1] rounded-md font-medium">
                                          {session.topic}
                                        </div>
                                      )}
                                    </div>
                                    
                                    {session.event && (
                                      <div className="mt-3 pt-3 border-t border-gray-100">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                          <p className="text-xs text-gray-500 font-medium">{session.event.title}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Timeline indicator */}
                                {index < sessionsOnDate.length - 1 && (
                                  <div className="absolute left-8 top-16 bottom-0 w-0.5 bg-gray-200 -translate-y-4"></div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            ) : todaysSessions.length === 0 ? (
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
