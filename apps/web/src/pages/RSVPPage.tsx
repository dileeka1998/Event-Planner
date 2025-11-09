import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Download, Calendar, Clock, MapPin } from 'lucide-react';
import { RSVP } from '../types';

interface RSVPPageProps {
  userRole: 'Organizer' | 'Attendee';
}

export function RSVPPage({ userRole }: RSVPPageProps) {
  const mySchedule = [
    {
      id: '1',
      title: 'AI in Modern Applications',
      time: '09:00 AM',
      date: 'March 15, 2025',
      location: 'Room A',
      status: 'Going' as const
    },
    {
      id: '2',
      title: 'Future of Web Development',
      time: '10:30 AM',
      date: 'March 15, 2025',
      location: 'Room B',
      status: 'Going' as const
    },
    {
      id: '3',
      title: 'Data Science Workshop',
      time: '02:00 PM',
      date: 'March 16, 2025',
      location: 'Room C',
      status: 'Waitlist' as const
    },
  ];

  const rsvpList: RSVP[] = [
    { id: '1', attendeeName: 'John Doe', sessionId: '1', status: 'Going', email: 'john@example.com' },
    { id: '2', attendeeName: 'Jane Smith', sessionId: '1', status: 'Going', email: 'jane@example.com' },
    { id: '3', attendeeName: 'Mike Johnson', sessionId: '1', status: 'Waitlist', email: 'mike@example.com' },
    { id: '4', attendeeName: 'Sarah Williams', sessionId: '1', status: 'Going', email: 'sarah@example.com' },
    { id: '5', attendeeName: 'Tom Brown', sessionId: '1', status: 'Cancelled', email: 'tom@example.com' },
  ];

  const getStatusColor = (status: 'Going' | 'Waitlist' | 'Cancelled') => {
    switch (status) {
      case 'Going': return 'bg-green-500';
      case 'Waitlist': return 'bg-[#F9B233]';
      case 'Cancelled': return 'bg-red-500';
    }
  };

  if (userRole === 'Attendee') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-gray-900 mb-2">My Schedule & RSVPs</h1>
          <p className="text-gray-600">View and manage your session registrations</p>
        </div>

        <Tabs defaultValue="upcoming">
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming Sessions</TabsTrigger>
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="past">Past Events</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-3 mt-6">
            {mySchedule.filter(s => s.status === 'Going').map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-gray-900">{session.title}</h3>
                        <Badge className={`${getStatusColor(session.status)} text-white`}>
                          {session.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{session.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{session.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Add to Calendar
                      </Button>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        Cancel RSVP
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="waitlist" className="space-y-3 mt-6">
            {mySchedule.filter(s => s.status === 'Waitlist').map((session) => (
              <Card key={session.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-gray-900">{session.title}</h3>
                        <Badge className={`${getStatusColor(session.status)} text-white`}>
                          {session.status}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{session.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4" />
                          <span>{session.time}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          <span>{session.location}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      Leave Waitlist
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Total RSVPs</p>
            <h3 className="text-gray-900">{rsvpList.length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Confirmed</p>
            <h3 className="text-green-600">{rsvpList.filter(r => r.status === 'Going').length}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-gray-600 mb-1">Waitlist</p>
            <h3 className="text-[#F9B233]">{rsvpList.filter(r => r.status === 'Waitlist').length}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendee List - AI in Modern Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Attendee Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rsvpList.map((rsvp) => (
                <TableRow key={rsvp.id}>
                  <TableCell>{rsvp.attendeeName}</TableCell>
                  <TableCell>{rsvp.email}</TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(rsvp.status)} text-white`}>
                      {rsvp.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm">Edit</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
