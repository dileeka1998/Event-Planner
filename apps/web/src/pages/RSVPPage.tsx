import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Download, Calendar, Clock, MapPin, Loader2, Users, ChevronDown, ChevronUp, ArrowRight, User } from 'lucide-react';
import { EventAttendee, Event, Session } from '../types';
import { getEvents, getEventAttendees, leaveEvent, registerAttendee, getAvailableEvents, getMySessions, getEventSessions, getMyRegistrations } from '../api';
import { toast } from 'sonner';

interface RSVPPageProps {
  userRole: 'Organizer' | 'Attendee';
}

// Get user ID from JWT
function getUserId(): number | null {
  const token = localStorage.getItem('app_token');
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const decoded = JSON.parse(jsonPayload);
    return decoded.sub || null;
  } catch {
    return null;
  }
}

export function RSVPPage({ userRole }: RSVPPageProps) {
  const [myRegistrations, setMyRegistrations] = useState<EventAttendee[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [attendees, setAttendees] = useState<EventAttendee[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableEvents, setAvailableEvents] = useState<Event[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());
  const [eventSessions, setEventSessions] = useState<Map<number, Session[]>>(new Map());
  const [registeringEventId, setRegisteringEventId] = useState<number | null>(null);

  useEffect(() => {
    if (userRole === 'Attendee') {
      fetchMyRegistrations();
      fetchAvailableEvents();
      fetchMySessions();
    } else {
      fetchEvents();
    }
  }, [userRole]);

  useEffect(() => {
    if (userRole === 'Organizer' && selectedEventId) {
      fetchAttendees(selectedEventId);
    }
  }, [selectedEventId, userRole]);

  const fetchMyRegistrations = async () => {
    setLoading(true);
    try {
      const { data } = await getMyRegistrations();
      // Map the response to match EventAttendee interface
      const registrations: EventAttendee[] = data.map((reg: any) => ({
        id: reg.id,
        eventId: reg.eventId,
        userId: reg.userId,
        status: reg.status,
        joinedAt: reg.joinedAt,
        event: reg.event,
        user: reg.user,
      }));
      setMyRegistrations(registrations);
      console.log('Fetched registrations:', registrations);
    } catch (error: any) {
      toast.error('Failed to fetch your registrations');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

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
      setAttendees(data);
    } catch (error: any) {
      toast.error('Failed to fetch attendees');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableEvents = async () => {
    try {
      const { data } = await getAvailableEvents();
      setAvailableEvents(data);
    } catch (error: any) {
      console.error('Failed to fetch available events', error);
    }
  };

  const fetchMySessions = async () => {
    try {
      const { data } = await getMySessions();
      setMySessions(data.map((s: any) => ({
        ...s,
        time: s.startTime ? new Date(s.startTime).toLocaleTimeString() : undefined,
        room: s.room?.name || null,
      })));
    } catch (error: any) {
      console.error('Failed to fetch my sessions', error);
    }
  };

  const fetchEventSessions = async (eventId: number) => {
    if (eventSessions.has(eventId)) {
      return; // Already loaded
    }
    try {
      const { data } = await getEventSessions(eventId);
      setEventSessions(prev => new Map(prev).set(eventId, data.map((s: any) => ({
        ...s,
        time: s.startTime ? new Date(s.startTime).toLocaleTimeString() : undefined,
        room: s.room?.name || null,
      }))));
    } catch (error: any) {
      console.error(`Failed to fetch sessions for event ${eventId}`, error);
    }
  };

  const toggleEventExpansion = (eventId: number) => {
    const newExpanded = new Set(expandedEvents);
    if (newExpanded.has(eventId)) {
      newExpanded.delete(eventId);
    } else {
      newExpanded.add(eventId);
      fetchEventSessions(eventId);
    }
    setExpandedEvents(newExpanded);
  };

  const handleRegister = async (eventId: number) => {
    setRegisteringEventId(eventId);
    try {
      await registerAttendee(eventId);
      toast.success('Successfully registered for event!');
      await fetchMyRegistrations();
      await fetchAvailableEvents();
      await fetchMySessions();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to register for event');
    } finally {
      setRegisteringEventId(null);
    }
  };

  const handleLeave = async (eventId: number) => {
    if (!confirm('Are you sure you want to leave this event?')) {
      return;
    }
    try {
      await leaveEvent(eventId);
      toast.success('Successfully left the event');
      // Refresh both registrations and available events
      await fetchMyRegistrations();
      await fetchAvailableEvents();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to leave event');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-green-500';
      case 'WAITLISTED': return 'bg-[#F9B233]';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'Going';
      case 'WAITLISTED': return 'Waitlist';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  if (userRole === 'Attendee') {
    // Filter upcoming events: registered events (CONFIRMED or WAITLISTED) that haven't started
    const upcoming = myRegistrations.filter((r) => {
      // Check status first
      if (r.status !== 'CONFIRMED' && r.status !== 'WAITLISTED') {
        return false;
      }
      
      // Check if event has startDate
      if (!r.event?.startDate) {
        console.log('Event missing startDate:', r.event);
        return false;
      }
      
      // Compare dates (normalize both to midnight for accurate comparison)
      try {
        const eventStart = new Date(r.event.startDate);
        if (isNaN(eventStart.getTime())) {
          console.log('Invalid event startDate:', r.event.startDate);
          return false;
        }
        eventStart.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Only show events that haven't started yet (including today)
        const isUpcoming = eventStart >= today;
        if (!isUpcoming) {
          console.log('Event is in the past:', r.event.title, 'startDate:', r.event.startDate, 'today:', today);
        }
        return isUpcoming;
      } catch (error) {
        console.error('Error parsing event date:', error, r.event);
        return false;
      }
    });
    
    // Filter past events: registered events that have ended
    const past = myRegistrations.filter((r) => {
      // Check if event has endDate
      if (!r.event?.endDate) {
        return false;
      }
      
      try {
        const eventEnd = new Date(r.event.endDate);
        if (isNaN(eventEnd.getTime())) {
          return false;
        }
        eventEnd.setHours(23, 59, 59, 999); // End of the day
        const today = new Date();
        
        // Show events that have ended (endDate is before today)
        return eventEnd < today;
      } catch (error) {
        console.error('Error parsing event end date:', error, r.event);
        return false;
      }
    });
    
    // Debug logging
    console.log('My Registrations:', myRegistrations.length);
    console.log('Upcoming Events:', upcoming.length);
    console.log('Past Events:', past.length);
    const confirmed = myRegistrations.filter(r => r.status === 'CONFIRMED');
    const waitlisted = myRegistrations.filter(r => r.status === 'WAITLISTED');

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2">My Schedule & RSVPs</h1>
          <p className="text-gray-600">View and manage your event registrations</p>
        </div>

        <Tabs defaultValue="browse">
          <TabsList>
            <TabsTrigger value="browse">Browse Events</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
            <TabsTrigger value="my-sessions">My Sessions</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="past">Past Events</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-3 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : availableEvents.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No available events to register for</p>
                <p className="text-sm mt-2">All upcoming events have been registered or have already started</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {availableEvents.map((event: any) => {
                  const isPast = new Date(event.startDate) < new Date();
                  const isRegistering = registeringEventId === event.id;
                  return (
                    <Card key={event.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <h3 className="text-gray-900 font-medium mb-3">{event.title}</h3>
                        <div className="space-y-2 text-sm text-gray-600 mb-4">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(event.startDate).toLocaleDateString()}
                              {event.startDate !== event.endDate && ` - ${new Date(event.endDate).toLocaleDateString()}`}
                            </span>
                          </div>
                          {event.venue && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              <span>{event.venue.name}</span>
                            </div>
                          )}
                          {event.capacity > 0 && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4" />
                              <span>
                                {event.availableSpots !== null 
                                  ? `${event.availableSpots} spots remaining`
                                  : `${event.confirmedCount} / ${event.capacity} registered`}
                                {event.isFull && <span className="text-yellow-600 ml-1">(Full - Join Waitlist)</span>}
                              </span>
                            </div>
                          )}
                        </div>
                        <Button
                          onClick={() => handleRegister(event.id)}
                          disabled={isPast || isRegistering}
                          className="w-full"
                          variant={isPast ? 'outline' : 'default'}
                        >
                          {isRegistering ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Registering...
                            </>
                          ) : isPast ? (
                            'Event Ended'
                          ) : event.isFull ? (
                            'Join Waitlist'
                          ) : (
                            'Register for Event'
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-3 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events registered</p>
                {myRegistrations.length > 0 && (
                  <p className="text-sm mt-2">
                    You have {myRegistrations.length} registration(s), but none are upcoming events.
                  </p>
                )}
              </div>
            ) : (
              upcoming.map((registration) => {
                const event = registration.event;
                const isExpanded = expandedEvents.has(event?.id || 0);
                const sessions = eventSessions.get(event?.id || 0) || [];
                return (
                  <Card key={registration.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-gray-900">{event?.title || event?.name}</h3>
                            <Badge className={`${getStatusColor(registration.status)} text-white`}>
                              {getStatusDisplay(registration.status)}
                            </Badge>
                            {sessions.length > 0 && (
                              <Badge variant="outline" className="text-xs">
                                {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{event?.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}</span>
                            </div>
                            {event?.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{event.venue.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span>Expected: {event?.expectedAudience || 0} attendees</span>
                            </div>
                          </div>
                          {isExpanded && sessions.length > 0 && (
                            <div className="mt-4 pt-4 border-t">
                              <h4 className="text-sm font-medium text-gray-900 mb-3">Sessions</h4>
                              <div className="space-y-2">
                                {sessions.map((session: Session) => (
                                  <div key={session.id} className="flex items-start gap-3 p-2 bg-gray-50 rounded">
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-900">{session.title}</p>
                                      {session.speaker && (
                                        <p className="text-xs text-gray-600">{session.speaker}</p>
                                      )}
                                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                                        {session.time && (
                                          <div className="flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            <span>{session.time}</span>
                                          </div>
                                        )}
                                        {session.room && (
                                          <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            <span>{session.room}</span>
                                          </div>
                                        )}
                                        <span>{session.durationMin} min</span>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => toggleEventExpansion(event?.id || 0)}
                            className="text-sm"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="w-4 h-4 mr-1" />
                                Hide Sessions
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-4 h-4 mr-1" />
                                View Sessions
                              </>
                            )}
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleLeave(event?.id || 0)}
                          >
                            Cancel RSVP
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-3 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : waitlisted.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No waitlisted events</p>
              </div>
            ) : (
              waitlisted.map((registration) => {
                const event = registration.event;
                return (
                  <Card key={registration.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-gray-900">{event?.title || event?.name}</h3>
                            <Badge className={`${getStatusColor(registration.status)} text-white`}>
                              {getStatusDisplay(registration.status)}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>{event?.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}</span>
                            </div>
                            {event?.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{event.venue.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span>Expected: {event?.expectedAudience || 0} attendees</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-red-600 hover:text-red-700"
                          onClick={() => handleLeave(event?.id || 0)}
                        >
                          Leave Waitlist
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          <TabsContent value="my-sessions" className="space-y-4 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : mySessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-gray-900 font-medium">No sessions scheduled</p>
                <p className="text-sm mt-2 text-gray-600">Register for events to see their sessions</p>
              </div>
            ) : (
              <div className="space-y-4">
                {mySessions.map((session: Session) => (
                  <Card key={session.id} className="hover:shadow-lg transition-all border-l-4 border-l-[#0F6AB4]">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1">
                              <h3 className="text-gray-900 font-semibold text-lg mb-1">{session.title}</h3>
                              {session.speaker && (
                                <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                                  <User className="w-4 h-4" />
                                  <span>{session.speaker}</span>
                                </div>
                              )}
                            </div>
                            {session.topic && (
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {session.topic}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                            {session.time && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4 text-[#0F6AB4]" />
                                <span className="font-medium">{session.time}</span>
                              </div>
                            )}
                            {session.room && (
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 text-[#0F6AB4]" />
                                <span className="font-medium">{session.room}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <span className="font-medium">{session.durationMin || session.duration} minutes</span>
                            </div>
                          </div>
                          
                          {session.event && (
                            <div className="mt-3 pt-3 border-t border-gray-200">
                              <Badge variant="outline" className="text-xs">
                                <Calendar className="w-3 h-3 inline mr-1" />
                                {session.event.title}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : past.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-gray-900 font-medium">No past events</p>
                <p className="text-sm mt-2 text-gray-600">Events you've attended will appear here</p>
              </div>
            ) : (
              past.map((registration) => {
                const event = registration.event;
                return (
                  <Card key={registration.id} className="hover:shadow-md transition-shadow opacity-75">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-gray-900 font-semibold">{event?.title || event?.name}</h3>
                            <Badge className={`${getStatusColor(registration.status)} text-white`}>
                              {getStatusDisplay(registration.status)}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              Past Event
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4" />
                              <span>
                                {event?.startDate ? new Date(event.startDate).toLocaleDateString() : 'TBD'}
                                {event?.endDate && event.startDate !== event.endDate && 
                                  ` - ${new Date(event.endDate).toLocaleDateString()}`
                                }
                              </span>
                            </div>
                            {event?.venue && (
                              <div className="flex items-center gap-2">
                                <MapPin className="w-4 h-4" />
                                <span>{event.venue.name}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <span>Expected: {event?.expectedAudience || 0} attendees</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Organizer View
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">RSVP Management</h1>
          <p className="text-gray-600">Track attendee registrations and waitlists</p>
        </div>
        <Button className="bg-[#0F6AB4] hover:bg-[#0D5A9A]">
          <Download className="w-4 h-4 mr-2" />
          Export Attendee List
        </Button>
      </div>

      {events.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Label htmlFor="event-select">Select Event:</Label>
              <Select 
                value={selectedEventId?.toString() || ''} 
                onValueChange={(value) => setSelectedEventId(parseInt(value))}
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-1">Total RSVPs</p>
                <h3 className="text-gray-900">{attendees.length}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-1">Confirmed</p>
                <h3 className="text-green-600">{attendees.filter(r => r.status === 'CONFIRMED').length}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <p className="text-sm text-gray-600 mb-1">Waitlist</p>
                <h3 className="text-[#F9B233]">{attendees.filter(r => r.status === 'WAITLISTED').length}</h3>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendee List</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : attendees.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <p>No attendees registered yet</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Attendee Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendees.map((attendee) => (
                      <TableRow key={attendee.id}>
                        <TableCell>{attendee.user?.name || attendee.name}</TableCell>
                        <TableCell>{attendee.user?.email || attendee.email}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(attendee.status)} text-white`}>
                            {getStatusDisplay(attendee.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(attendee.joinedAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!selectedEventId && events.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No events available</h3>
            <p className="text-gray-600">Create an event first to manage RSVPs</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
