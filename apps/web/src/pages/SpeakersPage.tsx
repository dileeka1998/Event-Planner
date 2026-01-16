import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Upload, Loader2, Trash2, Edit } from 'lucide-react';
import { Session, Event, Room } from '../types';
import { getEvents, getEvent, getEventSessions, createSession, updateSession, deleteSession } from '../api';
import { toast } from 'sonner';
import { SESSION_TOPICS } from '../constants/topics';

export function SpeakersPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [sessionForm, setSessionForm] = useState({
    title: '',
    speaker: '',
    durationMin: 60,
    startTime: '',
    roomId: 'none',
    topic: 'General',
    capacity: 0,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchSessions(selectedEventId);
      fetchEventRooms(selectedEventId);
    } else {
      setSessions([]);
      setRooms([]);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    setEventsLoading(true);
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
      setEventsLoading(false);
    }
  };

  const fetchSessions = async (eventId: number) => {
    setLoading(true);
    try {
      const { data } = await getEventSessions(eventId);
      setSessions(data);
    } catch (error: any) {
      toast.error('Failed to fetch sessions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEventRooms = async (eventId: number) => {
    try {
      const { data } = await getEvent(eventId);
      setRooms(data.rooms || []);
    } catch (error: any) {
      console.error('Failed to fetch rooms', error);
      setRooms([]);
    }
  };

  const handleOpenDialog = (session?: Session) => {
    console.log('handleOpenDialog called', { session, selectedEventId });
    if (session) {
      setEditingSession(session);
      setSessionForm({
        title: session.title,
        speaker: session.speaker || '',
        durationMin: session.durationMin,
        startTime: session.startTime ? (() => {
          // Convert UTC time from backend to local time for datetime-local input
          // The backend returns UTC time (e.g., "2026-01-17T18:30:00.000Z")
          // We need to convert it to local time for the datetime-local input
          const utcDate = new Date(session.startTime);
          // Get local date components (getFullYear, getMonth, etc. return local time values)
          const year = utcDate.getFullYear();
          const month = String(utcDate.getMonth() + 1).padStart(2, '0');
          const day = String(utcDate.getDate()).padStart(2, '0');
          const hours = String(utcDate.getHours()).padStart(2, '0');
          const minutes = String(utcDate.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        })() : '',
        roomId: session.room?.id?.toString() || 'none',
        topic: session.topic || 'General',
        capacity: session.capacity || 0,
      });
    } else {
      setEditingSession(null);
      setSessionForm({
        title: '',
        speaker: '',
        durationMin: 60,
        startTime: '',
        roomId: 'none',
        topic: 'General',
        capacity: 0,
      });
    }
    setIsDialogOpen(true);
    console.log('isDialogOpen set to true');
  };

  const handleCloseDialog = (open?: boolean) => {
    console.log('handleCloseDialog called', { open, isDialogOpen });
    // onOpenChange receives the new open state from Radix UI
    // If false or undefined, close the dialog
    if (open === false || open === undefined) {
      setIsDialogOpen(false);
      setEditingSession(null);
      setSessionForm({
        title: '',
        speaker: '',
        durationMin: 60,
        startTime: '',
        roomId: 'none',
        topic: 'General',
        capacity: 0,
      });
    } else {
      // If true, keep it open (shouldn't normally happen, but handle it)
      setIsDialogOpen(true);
    }
  };

  const handleSubmitSession = async () => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    if (!sessionForm.title.trim()) {
      toast.error('Please enter a session title');
      return;
    }

    if (sessionForm.durationMin < 1) {
      toast.error('Duration must be at least 1 minute');
      return;
    }

    // Validate capacity
    if (sessionForm.capacity < 0) {
      toast.error('Capacity cannot be negative');
      return;
    }

    // Calculate available capacity for validation
    const selectedEvent = events.find(e => e.id === selectedEventId);
    if (selectedEvent) {
      const eventCapacity = selectedEvent.expectedAudience || 0;
      const existingCapacitySum = sessions
        .filter(s => !editingSession || s.id !== editingSession.id)
        .reduce((sum, s) => sum + (s.capacity || 0), 0);
      const availableCapacity = eventCapacity - existingCapacitySum;

      if (sessionForm.capacity > availableCapacity) {
        toast.error(
          `Capacity (${sessionForm.capacity}) exceeds available capacity (${availableCapacity}). Event capacity: ${eventCapacity}, Already used: ${existingCapacitySum}`
        );
        return;
      }

      if (sessionForm.capacity > eventCapacity) {
        toast.error(`Capacity (${sessionForm.capacity}) cannot exceed event capacity (${eventCapacity})`);
        return;
      }
    }

    try {
      // Convert datetime-local (local time) to ISO string (UTC) for backend
      let startTimeISO: string | undefined = undefined;
      if (sessionForm.startTime) {
        // datetime-local input gives us a string like "2026-01-17T17:30" in local time
        // Create a Date object - this will interpret it as local time
        // Then convert to ISO string (UTC) for backend
        const localDate = new Date(sessionForm.startTime);
        // Check if date is valid
        if (isNaN(localDate.getTime())) {
          toast.error('Invalid date/time format');
          return;
        }
        startTimeISO = localDate.toISOString();
      }

      const sessionData = {
        title: sessionForm.title,
        speaker: sessionForm.speaker || undefined,
        durationMin: sessionForm.durationMin,
        startTime: startTimeISO,
        roomId: sessionForm.roomId && sessionForm.roomId !== 'none' ? parseInt(sessionForm.roomId) : undefined,
        topic: sessionForm.topic || 'General',
        capacity: sessionForm.capacity || 0,
      };

      if (editingSession) {
        await updateSession(selectedEventId, editingSession.id, sessionData);
        toast.success('Session updated successfully');
      } else {
        await createSession(selectedEventId, sessionData);
        toast.success('Session created successfully');
      }

      handleCloseDialog();
      if (selectedEventId) {
        await fetchSessions(selectedEventId);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save session');
      console.error(error);
    }
  };

  const handleDeleteSession = async (session: Session) => {
    if (!selectedEventId) return;

    if (!confirm(`Are you sure you want to delete "${session.title}"?`)) {
      return;
    }

    try {
      await deleteSession(selectedEventId, session.id);
      toast.success('Session deleted successfully');
      await fetchSessions(selectedEventId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete session');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Speakers & Sessions</h1>
          <p className="text-gray-600">Manage speakers and session details</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Speakers (CSV)
          </Button>
          <Button
            className="bg-[#0F6AB4] hover:bg-[#0D5A9A]"
            onClick={() => {
              console.log('Add Session button clicked', { selectedEventId, isDialogOpen });
              if (!selectedEventId) {
                toast.error('Please select an event first');
                return;
              }
              handleOpenDialog();
            }}
            disabled={!selectedEventId}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Session
          </Button>
        </div>
      </div>

      {/* Event Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="event-select" className="whitespace-nowrap">Select Event:</Label>
            <Select
              value={selectedEventId?.toString() || ''}
              onValueChange={(value) => setSelectedEventId(parseInt(value))}
              disabled={eventsLoading}
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

      {/* Add/Edit Session Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => {
        console.log('Dialog onOpenChange called', { open, isDialogOpen });
        handleCloseDialog(open);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingSession ? 'Edit Session' : 'Add New Session'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="sessionTitle">Session Title *</Label>
              <Input
                id="sessionTitle"
                placeholder="Enter session title"
                value={sessionForm.title}
                onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="speaker">Speaker Name</Label>
              <Input
                id="speaker"
                placeholder="Enter speaker name"
                value={sessionForm.speaker}
                onChange={(e) => setSessionForm({ ...sessionForm, speaker: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="topic">Topic *</Label>
              <Select
                value={sessionForm.topic}
                onValueChange={(value) => setSessionForm({ ...sessionForm, topic: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TOPICS.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  placeholder="60"
                  min="1"
                  value={sessionForm.durationMin}
                  onChange={(e) => setSessionForm({ ...sessionForm, durationMin: parseInt(e.target.value) || 60 })}
                />
              </div>
              <div>
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={sessionForm.startTime}
                  onChange={(e) => setSessionForm({ ...sessionForm, startTime: e.target.value })}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="capacity">Capacity *</Label>
              {(() => {
                const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;
                const eventCapacity = selectedEvent?.expectedAudience || 0;
                const existingCapacitySum = sessions
                  .filter(s => !editingSession || s.id !== editingSession.id)
                  .reduce((sum, s) => sum + (s.capacity || 0), 0);
                const availableCapacity = eventCapacity - existingCapacitySum;
                const maxCapacity = availableCapacity;
                
                return (
                  <>
                    <Input
                      id="capacity"
                      type="number"
                      placeholder="0"
                      min="0"
                      max={maxCapacity}
                      value={sessionForm.capacity}
                      onChange={(e) => setSessionForm({ ...sessionForm, capacity: parseInt(e.target.value) || 0 })}
                    />
                    {selectedEvent && (
                      <p className="text-xs text-gray-500 mt-1">
                        Available: {availableCapacity} / Event capacity: {eventCapacity}
                        {existingCapacitySum > 0 && (
                          <span className="ml-1">(Used: {existingCapacitySum})</span>
                        )}
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
            <div>
              <Label htmlFor="room">Room</Label>
              <Select
                value={sessionForm.roomId || 'none'}
                onValueChange={(value) => setSessionForm({ ...sessionForm, roomId: value === 'none' ? '' : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a room (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No room assigned</SelectItem>
                  {rooms.map((room) => (
                    <SelectItem key={room.id} value={room.id.toString()}>
                      {room.name} (Capacity: {room.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rooms.length === 0 && selectedEventId && (
                <p className="text-xs text-gray-500 mt-1">No rooms available for this event</p>
              )}
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button className="bg-[#0F6AB4] hover:bg-[#0D5A9A]" onClick={handleSubmitSession}>
                {editingSession ? 'Update Session' : 'Add Session'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Session List</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedEventId ? (
            <div className="text-center py-12 text-gray-500">
              <p>Please select an event to view sessions</p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No sessions found for this event. Click "Add Session" to create one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Speaker</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Start Time</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Capacity</TableHead>
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
                      {session.startTime
                        ? (() => {
                            // Parse UTC time from backend and display in local timezone
                            // The backend returns UTC time (e.g., "2026-01-17T18:30:00.000Z")
                            // new Date() automatically converts UTC to local time
                            const date = new Date(session.startTime);
                            return date.toLocaleString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                              hour12: true,
                              timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                            });
                          })()
                        : '-'}
                    </TableCell>
                    <TableCell>{session.room?.name || '-'}</TableCell>
                    <TableCell>
                      {session.capacity !== undefined && session.capacity !== null
                        ? session.capacity
                        : 0}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(session)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSession(session)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
