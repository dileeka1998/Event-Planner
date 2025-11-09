import { Calendar, Users, DollarSign, TrendingUp } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { QuickActions } from '../components/dashboard/QuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Event } from '../types';

interface OrganizerDashboardProps {
  onNavigate: (page: string) => void;
}

export function OrganizerDashboard({ onNavigate }: OrganizerDashboardProps) {
  const recentEvents: Event[] = [
    { 
      id: '1', 
      name: 'Tech Summit 2025', 
      dateRange: 'Mar 15-16, 2025', 
      budget: 250000, 
      expectedAudience: 500,
      description: 'Annual technology conference',
      status: 'Scheduled',
      createdAt: '2025-01-15'
    },
    { 
      id: '2', 
      name: 'Product Launch Event', 
      dateRange: 'Apr 5, 2025', 
      budget: 150000, 
      expectedAudience: 200,
      description: 'New product unveiling',
      status: 'Draft',
      createdAt: '2025-02-10'
    },
    { 
      id: '3', 
      name: 'Workshop Series', 
      dateRange: 'Feb 1-28, 2025', 
      budget: 80000, 
      expectedAudience: 150,
      description: 'Monthly educational workshops',
      status: 'Completed',
      createdAt: '2024-12-20'
    },
  ];

  const getStatusColor = (status: Event['status']) => {
    switch (status) {
      case 'Scheduled': return 'bg-[#28A9A1]';
      case 'Draft': return 'bg-[#F9B233]';
      case 'Completed': return 'bg-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Organizer Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here's an overview of your events</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Events"
          value="12"
          icon={Calendar}
          trend="+2 this month"
          trendUp={true}
          color="#0F6AB4"
        />
        <StatsCard 
          title="Upcoming Sessions"
          value="34"
          icon={TrendingUp}
          trend="Next: Tomorrow"
          trendUp={true}
          color="#28A9A1"
        />
        <StatsCard 
          title="Total Attendees"
          value="1,247"
          icon={Users}
          trend="+156 new"
          trendUp={true}
          color="#8B5CF6"
        />
        <StatsCard 
          title="Budget Utilization"
          value="87%"
          icon={DollarSign}
          trend="Within limits"
          trendUp={true}
          color="#10B981"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Recent Events</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentEvents.map((event) => (
                  <div 
                    key={event.id}
                    className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => onNavigate('events')}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-gray-900">{event.name}</h4>
                        <Badge className={`${getStatusColor(event.status)} text-white text-xs`}>
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600">{event.dateRange}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-900">LKR {event.budget.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">{event.expectedAudience} attendees</p>
                    </div>
                  </div>
                ))}
              </div>
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
