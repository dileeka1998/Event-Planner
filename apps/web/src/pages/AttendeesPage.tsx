import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AttendeeTable } from '../components/attendee/AttendeeTable';
import { Attendee, Event } from '../types';
import { toast } from 'sonner';
import { Users, Loader2, RotateCw } from 'lucide-react';
import { KPICard } from '../components/dashboard/KPICard';
import { getEventAttendees, getEvents } from '../api';
import { Label } from '@/components/ui/label';

export function AttendeesPage() {
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchAttendees(selectedEventId);
    } else {
      setAttendees([]);
    }
  }, [selectedEventId]);

  // Refresh attendees when page regains focus
  useEffect(() => {
    const handleFocus = () => {
      if (selectedEventId) {
        fetchAttendees(selectedEventId);
      }
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [selectedEventId]);

  const fetchEvents = async () => {
    try {
      const { data } = await getEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        // Sort events by startDate descending (latest first) and select the latest
        const sortedEvents = [...data].sort((a, b) => {
          const dateA = new Date(a.startDate).getTime();
          const dateB = new Date(b.startDate).getTime();
          return dateB - dateA; // Descending order (latest first)
        });
        setSelectedEventId(sortedEvents[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to fetch events');
      console.error(error);
    }
  };

  const fetchAttendees = async (eventId: number) => {
    setLoading(true);
    try {
      const { data } = await getEventAttendees(eventId);
      // Filter out CANCELLED attendees from display (backend should already exclude them, but double-check)
      const activeAttendees = data.filter((a: any) => a.status !== 'CANCELLED');
      setAttendees(activeAttendees.map((a: any) => ({
        id: a.id,
        name: a.user?.name || '',
        email: a.user?.email || '',
        eventId: a.eventId,
        status: a.status,
        joinedAt: a.joinedAt,
        phone: a.user?.phone,
      })));
    } catch (error: any) {
      toast.error('Failed to fetch attendees');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveAttendee = (id: number) => {
    // Note: This would need a backend endpoint to remove attendees
    // For now, just show a message
    toast.info('Attendee removal functionality requires backend support');
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Status', 'Joined At'],
      ...attendees.map(a => [
        a.name,
        a.email,
        a.phone || '-',
        a.status,
        new Date(a.joinedAt).toLocaleString(),
      ]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendees-${Date.now()}.csv`;
    a.click();
    toast.success('CSV exported successfully');
  };

  const confirmedCount = attendees.filter(a => a.status === 'CONFIRMED').length;
  const waitlistedCount = attendees.filter(a => a.status === 'WAITLISTED').length;
  const cancelledCount = attendees.filter(a => a.status === 'CANCELLED').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Attendee Management</h1>
        <p className="text-gray-600">Manage event registrations and attendees</p>
      </div>

      {events.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="event-select">Select Event:</Label>
              <Select 
                value={selectedEventId?.toString() || ''} 
                onValueChange={(value: string) => setSelectedEventId(parseInt(value))}
              >
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select an event" />
                </SelectTrigger>
                <SelectContent>
                  {events.map((event) => (
                    <SelectItem key={event.id} value={event.id.toString()}>
                      {event.title || event.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedEventId && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <KPICard 
              title="Total Attendees"
              value={attendees.length}
              icon={Users}
              color="#0F6AB4"
              trend="All registered users"
            />
            <KPICard 
              title="Confirmed"
              value={confirmedCount}
              icon={Users}
              color="#10B981"
              trend={attendees.length > 0 ? `${((confirmedCount / attendees.length) * 100).toFixed(0)}% of total` : '0%'}
            />
            <KPICard 
              title="Waitlisted"
              value={waitlistedCount}
              icon={Users}
              color="#F9B233"
              trend={attendees.length > 0 ? `${((waitlistedCount / attendees.length) * 100).toFixed(0)}% of total` : '0%'}
            />
            <KPICard 
              title="Attendance Rate"
              value={attendees.length > 0 ? `${((confirmedCount / attendees.length) * 100).toFixed(0)}%` : '0%'}
              icon={Users}
              color="#28A9A1"
              showProgress
              progressValue={attendees.length > 0 ? (confirmedCount / attendees.length) * 100 : 0}
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Registered Attendees</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedEventId && fetchAttendees(selectedEventId)}
                  disabled={loading}
                >
                  <RotateCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <AttendeeTable 
                  attendees={attendees}
                  onRemoveAttendee={handleRemoveAttendee}
                  onExport={handleExportCSV}
                />
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEventId && events.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No events available</h3>
            <p className="text-gray-600">Create an event first to manage attendees</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
