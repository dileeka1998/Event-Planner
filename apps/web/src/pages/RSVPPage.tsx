import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Label } from '../components/ui/label';
import { Download, Calendar, Clock, MapPin, Loader2 } from 'lucide-react';
import { EventAttendee, Event } from '../types';
import { getEvents, getEventAttendees, leaveEvent, registerAttendee } from '../api';
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

  useEffect(() => {
    if (userRole === 'Attendee') {
      fetchMyRegistrations();
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
      const userId = getUserId();
      if (!userId) {
        toast.error('Please login to view your registrations');
        return;
      }

      const { data: eventsData } = await getEvents();
      const registrations: EventAttendee[] = [];
      
      for (const event of eventsData) {
        try {
          const { data: attendeesData } = await getEventAttendees(event.id);
          const myRegistration = attendeesData.find((a: any) => a.userId === userId);
          if (myRegistration) {
            registrations.push({
              ...myRegistration,
              event: event,
            });
          }
        } catch {
          // Event might not have attendees endpoint accessible
        }
      }
      
      setMyRegistrations(registrations);
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
        setSelectedEventId(data[0].id);
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

  const handleRegister = async (eventId: number) => {
    try {
      await registerAttendee(eventId);
      toast.success('Successfully registered for event!');
      await fetchMyRegistrations();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to register for event');
    }
  };

  const handleLeave = async (eventId: number) => {
    if (!confirm('Are you sure you want to leave this event?')) {
      return;
    }
    try {
      await leaveEvent(eventId);
      toast.success('Successfully left the event');
      await fetchMyRegistrations();
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
    const confirmed = myRegistrations.filter(r => r.status === 'CONFIRMED');
    const waitlisted = myRegistrations.filter(r => r.status === 'WAITLISTED');

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2">My Schedule & RSVPs</h1>
          <p className="text-gray-600">View and manage your event registrations</p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Events</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="past">Past Events</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3 mt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : confirmed.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming events registered</p>
              </div>
            ) : (
              confirmed.map((registration) => {
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
                        <div className="flex gap-2">
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

          <TabsContent value="past" className="mt-6">
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No past events yet</p>
            </div>
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
