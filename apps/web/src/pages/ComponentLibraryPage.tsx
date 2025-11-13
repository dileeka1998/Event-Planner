import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { KPICard } from '../components/dashboard/KPICard';
import { VenueCard } from '../components/venue/VenueCard';
import { AttendeeTable } from '../components/attendee/AttendeeTable';
import { BudgetLineTable } from '../components/budget/BudgetLineTable';
import { AIParseLoader } from '../components/ai/AIParseLoader';
import { Calendar, Users, DollarSign, MapPin } from 'lucide-react';
import { Venue, Attendee, BudgetLineItem } from '../types';

export function ComponentLibraryPage() {
  const sampleVenue: Venue = {
    id: '1',
    name: 'Grand Ballroom',
    address: '123 Convention Center, Colombo',
    capacity: 500,
    hourlyRate: 50000,
    contact: '+94 11 234 5678',
    location: 'Colombo',
    amenities: ['WiFi', 'AV Equipment', 'Parking'],
  };

  const sampleAttendees: Attendee[] = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      eventId: '1',
      status: 'Confirmed',
      joinedAt: '2025-01-15T10:30:00',
      phone: '+94 77 123 4567',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      eventId: '1',
      status: 'Waitlisted',
      joinedAt: '2025-01-16T14:20:00',
    },
  ];

  const sampleBudgetItems: BudgetLineItem[] = [
    {
      id: '1',
      category: 'Venue',
      description: 'Grand Ballroom Rental',
      quantity: 8,
      unit: 'hours',
      estimatedCost: 50000,
      actualCost: 45000,
      vendor: 'Convention Center',
      status: 'Paid',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Component Library</h1>
        <p className="text-gray-600">Reusable components for the AI-Driven Smart Event Planner</p>
      </div>

      {/* Status Chips */}
      <Card>
        <CardHeader>
          <CardTitle>Status Chips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Attendee Status:</p>
              <div className="flex gap-2">
                <Badge className="bg-green-500 text-white">Confirmed</Badge>
                <Badge className="bg-[#F9B233] text-white">Waitlisted</Badge>
                <Badge className="bg-red-500 text-white">Cancelled</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Event Status:</p>
              <div className="flex gap-2">
                <Badge className="bg-[#28A9A1] text-white">Scheduled</Badge>
                <Badge className="bg-[#F9B233] text-white">Draft</Badge>
                <Badge className="bg-gray-400 text-white">Completed</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600">Budget Status:</p>
              <div className="flex gap-2">
                <Badge className="bg-green-500 text-white">Paid</Badge>
                <Badge className="bg-[#F9B233] text-white">Pending</Badge>
                <Badge className="bg-gray-400 text-white">Planned</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <Card>
        <CardHeader>
          <CardTitle>KPI Cards</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard 
              title="Total Events"
              value="12"
              icon={Calendar}
              color="#0F6AB4"
              trend="+2 this month"
            />
            <KPICard 
              title="Active Attendees"
              value="1,247"
              icon={Users}
              color="#28A9A1"
              trend="+156 new"
            />
            <KPICard 
              title="Budget Usage"
              value="87%"
              icon={DollarSign}
              color="#10B981"
              showProgress
              progressValue={87}
            />
            <KPICard 
              title="Venue Utilization"
              value="78%"
              icon={MapPin}
              color="#8B5CF6"
              showProgress
              progressValue={78}
            />
          </div>
        </CardContent>
      </Card>

      {/* Venue Card */}
      <Card>
        <CardHeader>
          <CardTitle>Venue Card Component</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <VenueCard venue={sampleVenue} />
            <VenueCard venue={sampleVenue} compact />
          </div>
        </CardContent>
      </Card>

      {/* AI Parse Loader */}
      <Card>
        <CardHeader>
          <CardTitle>AI Parse Loader</CardTitle>
        </CardHeader>
        <CardContent>
          <AIParseLoader message="AI is analyzing your event..." />
        </CardContent>
      </Card>

      {/* Attendee Table */}
      <Card>
        <CardHeader>
          <CardTitle>Attendee Table Component</CardTitle>
        </CardHeader>
        <CardContent>
          <AttendeeTable 
            attendees={sampleAttendees}
            showActions={false}
          />
        </CardContent>
      </Card>

      {/* Budget Line Table */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Line Table Component</CardTitle>
        </CardHeader>
        <CardContent>
          <BudgetLineTable 
            items={sampleBudgetItems}
            onAddItem={() => {}}
            onUpdateItem={() => {}}
            onDeleteItem={() => {}}
          />
        </CardContent>
      </Card>

      {/* Color Palette */}
      <Card>
        <CardHeader>
          <CardTitle>Color Palette</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div className="h-20 rounded-lg bg-[#0F6AB4] mb-2"></div>
              <p className="text-sm">Primary Blue</p>
              <p className="text-xs text-gray-500">#0F6AB4</p>
            </div>
            <div>
              <div className="h-20 rounded-lg bg-[#28A9A1] mb-2"></div>
              <p className="text-sm">Secondary Teal</p>
              <p className="text-xs text-gray-500">#28A9A1</p>
            </div>
            <div>
              <div className="h-20 rounded-lg bg-[#F9B233] mb-2"></div>
              <p className="text-sm">Accent Yellow</p>
              <p className="text-xs text-gray-500">#F9B233</p>
            </div>
            <div>
              <div className="h-20 rounded-lg bg-[#8B5CF6] mb-2"></div>
              <p className="text-sm">Purple</p>
              <p className="text-xs text-gray-500">#8B5CF6</p>
            </div>
            <div>
              <div className="h-20 rounded-lg bg-[#10B981] mb-2"></div>
              <p className="text-sm">Green</p>
              <p className="text-xs text-gray-500">#10B981</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
