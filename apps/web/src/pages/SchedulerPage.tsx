import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Sparkles, Save, Download, Loader2, Calendar, Edit, Check, X } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../components/ui/dialog';
import { Event, Session, Room } from '../types';
import { getEvents, getEvent, generateSchedule, updateSession, getEventSessions } from '../api';
import { toast } from 'sonner';

export function SchedulerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<{ roomId: string; startTime: string }>({ roomId: 'none', startTime: '' });
  const [showGapDialog, setShowGapDialog] = useState(false);
  const [gapMinutes, setGapMinutes] = useState(15);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventDetails(selectedEventId);
    } else {
      setSelectedEvent(null);
      setSessions([]);
      setRooms([]);
    }
  }, [selectedEventId]);

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

  const fetchEventDetails = async (eventId: number) => {
    setLoading(true);
    try {
      const { data: eventData } = await getEvent(eventId);
      setSelectedEvent(eventData);
      setRooms(eventData.rooms || []);

      const { data: sessionsData } = await getEventSessions(eventId);
      setSessions(sessionsData);
    } catch (error: any) {
      toast.error('Failed to fetch event details');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateScheduleClick = () => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }
    setShowGapDialog(true);
  };

  const handleGenerateSchedule = async () => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    setShowGapDialog(false);
    setGenerating(true);
    try {
      const { data } = await generateSchedule(selectedEventId, gapMinutes);
      toast.success(data.message || 'Schedule generated successfully');
      // Refresh event details to show updated schedule
      await fetchEventDetails(selectedEventId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to generate schedule');
      console.error(error);
    } finally {
      setGenerating(false);
    }
  };

  const handleStartEdit = (session: Session) => {
    setEditingSessionId(session.id);
    setEditForm({
      roomId: session.room?.id?.toString() || 'none',
      startTime: session.startTime
        ? (() => {
            // Convert UTC to local datetime-local format
            const date = new Date(session.startTime);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${year}-${month}-${day}T${hours}:${minutes}`;
          })()
        : '',
    });
  };

  const handleCancelEdit = () => {
    setEditingSessionId(null);
    setEditForm({ roomId: 'none', startTime: '' });
  };

  const handleSaveEdit = async (session: Session) => {
    if (!selectedEventId) return;

    try {
      // Convert local datetime to UTC ISO string
      let startTimeISO: string | undefined = undefined;
      if (editForm.startTime) {
        const localDate = new Date(editForm.startTime);
        if (isNaN(localDate.getTime())) {
          toast.error('Invalid date/time format');
          return;
        }
        startTimeISO = localDate.toISOString();
      }

      const updateData: any = {};
      if (editForm.roomId && editForm.roomId !== 'none') {
        updateData.roomId = parseInt(editForm.roomId);
      } else {
        updateData.roomId = null;
      }
      if (startTimeISO !== undefined) {
        updateData.startTime = startTimeISO;
      }

      await updateSession(selectedEventId, session.id, updateData);
      toast.success('Session updated successfully');
      setEditingSessionId(null);
      await fetchEventDetails(selectedEventId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update session');
      console.error(error);
    }
  };

  const formatDateTime = (dateTime: string | null | undefined) => {
    if (!dateTime) return '-';
    const date = new Date(dateTime);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Event Scheduler</h1>
          <p className="text-gray-600">AI-powered scheduling for optimal session placement</p>
        </div>
        {selectedEvent && rooms.length > 0 && sessions.length > 0 && (
          <Button
            onClick={handleGenerateScheduleClick}
            disabled={generating}
            className="bg-[#0F6AB4] hover:bg-[#0D5A9A]"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Schedule
              </>
            )}
          </Button>
        )}
      </div>

      {events.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="event-select" className="text-sm font-medium">Select Event:</Label>
              <Select
                value={selectedEventId?.toString() || ''}
                onValueChange={(value) => setSelectedEventId(parseInt(value))}
                disabled={loading}
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
            {sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No sessions found. Add sessions to generate a schedule.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session Title</TableHead>
                    <TableHead>Speaker</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Room</TableHead>
                    <TableHead>Start Time</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-medium">{session.title}</TableCell>
                      <TableCell>{session.speaker || '-'}</TableCell>
                      <TableCell>
                        <span className="px-2 py-1 bg-[#0F6AB4]/10 text-[#0F6AB4] rounded text-xs">
                          {session.topic || 'General'}
                        </span>
                      </TableCell>
                      <TableCell>{session.durationMin} min</TableCell>
                      <TableCell>
                        {editingSessionId === session.id ? (
                          <Select
                            value={editForm.roomId}
                            onValueChange={(value) => setEditForm({ ...editForm, roomId: value })}
                          >
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">No room</SelectItem>
                              {rooms.map((room) => (
                                <SelectItem key={room.id} value={room.id.toString()}>
                                  {room.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          session.room?.name || '-'
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSessionId === session.id ? (
                          <Input
                            type="datetime-local"
                            value={editForm.startTime}
                            onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                            className="w-48"
                          />
                        ) : (
                          formatDateTime(session.startTime)
                        )}
                      </TableCell>
                      <TableCell>
                        {editingSessionId === session.id ? (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSaveEdit(session)}
                              className="text-green-600 hover:text-green-700"
                            >
                              <Check className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(session)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gap Time Dialog */}
      <Dialog open={showGapDialog} onOpenChange={setShowGapDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Set Gap Time Between Sessions</DialogTitle>
            <DialogDescription>
              How many minutes should be between sessions in the same room? This allows time for attendees to leave and setup for the next session.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="gapMinutes">Gap Time (minutes)</Label>
              <Input
                id="gapMinutes"
                type="number"
                min="0"
                max="60"
                value={gapMinutes}
                onChange={(e) => setGapMinutes(parseInt(e.target.value) || 0)}
                className="mt-2"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 15-30 minutes. This ensures smooth transitions between sessions.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGapDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#0F6AB4] hover:bg-[#0D5A9A]"
              onClick={handleGenerateSchedule}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
