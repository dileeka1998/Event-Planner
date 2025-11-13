import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Sparkles, Save, Download, Loader2, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Event, Session, Room } from '../types';
import { getEvents } from '../api';
import { toast } from 'sonner';

export function SchedulerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await getEvents();
      setEvents(data);
      if (data.length > 0 && !selectedEventId) {
        setSelectedEventId(data[0].id);
      }
    } catch (error: any) {
      toast.error('Failed to fetch events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const rooms = selectedEvent?.rooms || [];
  const sessions = selectedEvent?.sessions || [];

  const handleGenerateSchedule = () => {
    // Note: This would require a backend scheduler endpoint
    toast.info('Schedule generation requires backend scheduler integration');
    setScheduleGenerated(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Event Scheduler</h1>
          <p className="text-gray-600">AI-powered scheduling for optimal session placement</p>
        </div>
        {selectedEvent && (
          <Button 
            onClick={handleGenerateSchedule}
            className="bg-[#0F6AB4] hover:bg-[#0D5A9A]"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Schedule
          </Button>
        )}
      </div>

      {events.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Select Event:</label>
              <select
                value={selectedEventId || ''}
                onChange={(e) => setSelectedEventId(parseInt(e.target.value))}
                className="px-3 py-2 border rounded-md"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title || event.name}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : !selectedEvent ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No events available</h3>
            <p className="text-gray-600">Create an event first to generate a schedule</p>
          </CardContent>
        </Card>
      ) : rooms.length === 0 || sessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Alert>
              <AlertDescription>
                {rooms.length === 0 && sessions.length === 0
                  ? 'This event needs rooms and sessions to generate a schedule. Add them in the event details.'
                  : rooms.length === 0
                  ? 'This event needs rooms to generate a schedule.'
                  : 'This event needs sessions to generate a schedule.'}
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Schedule for {selectedEvent.title || selectedEvent.name}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12 text-gray-500">
              <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Schedule generation feature coming soon</p>
              <p className="text-sm mt-2">
                This will use AI-powered optimization to assign sessions to rooms and time slots.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
