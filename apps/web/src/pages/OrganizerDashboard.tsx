import { useState, useEffect } from 'react';
import { Calendar, Users, DollarSign, MapPin, Percent, Loader2 } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Event } from '../types';
import { KPICard } from '../components/dashboard/KPICard';
import { getEvents } from '../api';
import { toast } from 'sonner';

interface OrganizerDashboardProps {
  onNavigate: (page: string) => void;
}

export function OrganizerDashboard({ onNavigate }: OrganizerDashboardProps) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await getEvents();
      setEvents(data.map((e: any) => ({
        ...e,
        name: e.title,
        dateRange: e.startDate === e.endDate 
          ? new Date(e.startDate).toLocaleDateString()
          : `${new Date(e.startDate).toLocaleDateString()} - ${new Date(e.endDate).toLocaleDateString()}`,
        budget: parseFloat(e.budget || '0'),
        description: e.description || '',
        status: getEventStatus(e),
      })));
    } catch (error: any) {
      toast.error('Failed to fetch events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getEventStatus = (event: any): 'Draft' | 'Scheduled' | 'Completed' => {
    const today = new Date();
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    
    if (endDate < today) return 'Completed';
    if (startDate <= today && endDate >= today) return 'Scheduled';
    return 'Draft';
  };

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'Scheduled': return 'bg-[#28A9A1]';
      case 'Draft': return 'bg-[#F9B233]';
      case 'Completed': return 'bg-gray-400';
    }
  };

  // Calculate KPIs from real data
  const totalEvents = events.length;
  const totalAttendees = events.reduce((sum, e) => sum + (e.attendees?.length || 0), 0);
  const confirmedAttendees = events.reduce((sum, e) => 
    sum + (e.attendees?.filter(a => a.status === 'CONFIRMED').length || 0), 0
  );
  
  // Calculate venue utilization (events with venues / total events)
  const eventsWithVenues = events.filter(e => e.venue).length;
  const venueUtilization = totalEvents > 0 ? Math.round((eventsWithVenues / totalEvents) * 100) : 0;
  
  // Calculate budget usage (total actual / total estimated)
  const totalEstimated = events.reduce((sum, e) => 
    sum + parseFloat(e.eventBudget?.totalEstimated || '0'), 0
  );
  const totalActual = events.reduce((sum, e) => 
    sum + parseFloat(e.eventBudget?.totalActual || '0'), 0
  );
  const budgetUsage = totalEstimated > 0 ? Math.round((totalActual / totalEstimated) * 100) : 0;

  const recentEvents = events.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Organizer Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's an overview of your events</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Events"
          value={totalEvents.toString()}
          icon={Calendar}
          color="#0F6AB4"
          trend={events.length > 0 ? `${events.filter(e => e.status === 'Scheduled').length} active` : 'No events'}
        />
        <KPICard 
          title="Active Attendees"
          value={confirmedAttendees.toLocaleString()}
          icon={Users}
          color="#28A9A1"
          trend={totalAttendees > 0 ? `${totalAttendees} total registered` : 'No attendees'}
        />
        <KPICard 
          title="Venue Utilization"
          value={`${venueUtilization}%`}
          icon={MapPin}
          color="#8B5CF6"
          showProgress
          progressValue={venueUtilization}
        />
        <KPICard 
          title="Budget Usage"
          value={`${budgetUsage}%`}
          icon={Percent}
          color="#10B981"
          showProgress
          progressValue={budgetUsage}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button 
          onClick={() => onNavigate('venues')} 
          className="h-20 bg-white border-2 border-[#0F6AB4] text-[#0F6AB4] hover:bg-[#0F6AB4] hover:text-white"
        >
          <div className="flex flex-col items-center">
            <MapPin className="w-6 h-6 mb-1" />
            <span>Add Venue</span>
          </div>
        </Button>
        <Button 
          onClick={() => onNavigate('budget')} 
          className="h-20 bg-white border-2 border-[#28A9A1] text-[#28A9A1] hover:bg-[#28A9A1] hover:text-white"
        >
          <div className="flex flex-col items-center">
            <DollarSign className="w-6 h-6 mb-1" />
            <span>View Budget Report</span>
          </div>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : recentEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No events yet. Create your first event to get started.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentEvents.map((event) => (
                    <div 
                      key={event.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => onNavigate('events')}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-gray-900">{event.name || event.title}</h4>
                          {event.status && (
                            <Badge className={`${getStatusColor(event.status)} text-white text-xs`}>
                              {event.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{event.dateRange}</p>
                        {event.venue && (
                          <p className="text-xs text-gray-500 mt-1">
                            <MapPin className="w-3 h-3 inline mr-1" />
                            {event.venue.name}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-900">LKR {event.budget?.toLocaleString() || '0'}</p>
                        <p className="text-xs text-gray-500">{event.expectedAudience} expected</p>
                        {event.attendees && event.attendees.length > 0 && (
                          <p className="text-xs text-gray-500">{event.attendees.length} registered</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <QuickActions 
            onCreateEvent={() => onNavigate('events')}
            onRunScheduler={() => onNavigate('scheduler')}
            onExportTimetable={() => onNavigate('scheduler')}
          />
        </div>
      </div>
    </div>
  );
}
