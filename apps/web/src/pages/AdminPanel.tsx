import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Users, Calendar, Activity, Database, Plus, Download, MapPin, DollarSign, TrendingUp, BarChart3, Loader2 } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { KPICard } from '../components/dashboard/KPICard';
import { User, Venue, Event } from '../types';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '../components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from 'recharts';
import { getUsers, getVenues, getEvents } from '../api';
import { toast } from 'sonner';

export function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [usersRes, venuesRes, eventsRes] = await Promise.all([
        getUsers().catch(() => ({ data: [] })),
        getVenues().catch(() => ({ data: [] })),
        getEvents().catch(() => ({ data: [] })),
      ]);

      setUsers(usersRes.data || []);
      setVenues((venuesRes.data || []).map((v: any) => ({
        ...v,
        location: v.address?.split(',')?.pop()?.trim() || '',
      })));
      setEvents(eventsRes.data || []);
    } catch (error: any) {
      toast.error('Failed to fetch admin data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case 'ADMIN': return 'bg-red-500';
      case 'ORGANIZER': return 'bg-[#0F6AB4]';
      case 'ATTENDEE': return 'bg-[#28A9A1]';
      default: return 'bg-gray-400';
    }
  };

  const getRoleDisplay = (role: User['role']) => {
    switch (role) {
      case 'ADMIN': return 'Admin';
      case 'ORGANIZER': return 'Organizer';
      case 'ATTENDEE': return 'Attendee';
      default: return role;
    }
  };

  // Calculate stats
  const totalUsers = users.length;
  const totalEvents = events.length;
  const totalVenues = venues.length;
  const activeEvents = events.filter(e => {
    const today = new Date();
    const startDate = new Date(e.startDate);
    const endDate = new Date(e.endDate);
    return startDate <= today && endDate >= today;
  }).length;

  // Calculate venue utilization
  const venueUtilizationMap = new Map<number, number>();
  events.forEach(event => {
    if (event.venue) {
      const current = venueUtilizationMap.get(event.venue.id) || 0;
      venueUtilizationMap.set(event.venue.id, current + 1);
    }
  });

  // Calculate financial data
  const totalBudget = events.reduce((sum, e) => sum + parseFloat(e.budget || '0'), 0);
  const totalEstimated = events.reduce((sum, e) => 
    sum + parseFloat(e.eventBudget?.totalEstimated || '0'), 0
  );
  const avgEventBudget = totalEvents > 0 ? totalBudget / totalEvents : 0;

  // Top events by budget
  const topEvents = [...events]
    .sort((a, b) => parseFloat(b.budget || '0') - parseFloat(a.budget || '0'))
    .slice(0, 5)
    .map(e => ({
      name: e.title || e.name || 'Untitled Event',
      budget: parseFloat(e.budget || '0'),
      attendees: e.attendees?.length || 0,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">System management and oversight</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Users"
          value={totalUsers.toLocaleString()}
          icon={Users}
          color="#0F6AB4"
          trend={`${users.filter(u => u.role === 'ORGANIZER').length} organizers`}
        />
        <KPICard 
          title="Total Events"
          value={totalEvents.toString()}
          icon={Calendar}
          color="#28A9A1"
          trend={`${activeEvents} active`}
        />
        <KPICard 
          title="Total Venues"
          value={totalVenues.toString()}
          icon={MapPin}
          color="#8B5CF6"
          trend={`${venueUtilizationMap.size} in use`}
        />
        <KPICard 
          title="Total Budget"
          value={`LKR ${(totalBudget / 1000000).toFixed(1)}M`}
          icon={Database}
          color="#F9B233"
          trend={`Across ${totalEvents} events`}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="venues">Venues</TabsTrigger>
            <TabsTrigger value="financial">Financial Reports</TabsTrigger>
            <TabsTrigger value="system">System Metrics</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>User Management</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export Users
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {users.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No users found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>{user.name}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>
                            <Badge className={`${getRoleBadgeColor(user.role)} text-white`}>
                              {getRoleDisplay(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button variant="ghost" size="sm">Edit</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="venues" className="mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Venues Overview</CardTitle>
                  <Button variant="outline">
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {venues.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No venues found</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Venue Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Hourly Rate</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {venues.map((venue) => {
                        const utilization = venueUtilizationMap.get(venue.id) || 0;
                        return (
                          <TableRow key={venue.id}>
                            <TableCell>{venue.name}</TableCell>
                            <TableCell>{venue.location || venue.address}</TableCell>
                            <TableCell>{venue.capacity} people</TableCell>
                            <TableCell>
                              {venue.hourlyRate ? `LKR ${parseFloat(venue.hourlyRate).toLocaleString()}/hr` : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge className={utilization > 0 ? "bg-green-500 text-white" : "bg-gray-400 text-white"}>
                                {utilization > 0 ? 'In Use' : 'Available'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="financial" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard 
                  title="Total Budget"
                  value={`LKR ${(totalBudget / 1000).toFixed(0)}K`}
                  icon={DollarSign}
                  color="#10B981"
                  trend={`Across ${totalEvents} events`}
                />
                <KPICard 
                  title="Avg Event Budget"
                  value={`LKR ${(avgEventBudget / 1000).toFixed(0)}K`}
                  icon={BarChart3}
                  color="#0F6AB4"
                  trend="Per event average"
                />
                <KPICard 
                  title="Total Estimated"
                  value={`LKR ${(totalEstimated / 1000).toFixed(0)}K`}
                  icon={TrendingUp}
                  color="#28A9A1"
                  trend="From budget items"
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Top 5 Events by Budget</CardTitle>
                </CardHeader>
                <CardContent>
                  {topEvents.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p>No events found</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event Name</TableHead>
                          <TableHead>Budget</TableHead>
                          <TableHead>Attendees</TableHead>
                          <TableHead>Per Attendee Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {topEvents.map((event, index) => (
                          <TableRow key={index}>
                            <TableCell>{event.name}</TableCell>
                            <TableCell>LKR {event.budget.toLocaleString()}</TableCell>
                            <TableCell>{event.attendees}</TableCell>
                            <TableCell>
                              {event.attendees > 0 
                                ? `LKR ${(event.budget / event.attendees).toFixed(0)}`
                                : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-1">Total Users</p>
                    <h2 className="text-gray-900">{totalUsers}</h2>
                    <p className="text-xs text-gray-500 mt-1">Registered users</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-1">Total Events</p>
                    <h2 className="text-gray-900">{totalEvents}</h2>
                    <p className="text-xs text-gray-500 mt-1">{activeEvents} active</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-1">Total Venues</p>
                    <h2 className="text-gray-900">{totalVenues}</h2>
                    <p className="text-xs text-gray-500 mt-1">{venueUtilizationMap.size} in use</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-1">System Status</p>
                    <h2 className="text-gray-900">Operational</h2>
                    <p className="text-xs text-green-600 mt-1">All systems normal</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm">Database</span>
                        <Badge className="bg-green-500 text-white">Operational</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm">API Services</span>
                        <Badge className="bg-green-500 text-white">Operational</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <span className="text-sm">AI Engine (spaCy)</span>
                        <Badge className="bg-green-500 text-white">Operational</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Maintenance Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button variant="outline" className="w-full justify-start">
                        <Database className="w-4 h-4 mr-2" />
                        Run Data Backup
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Activity className="w-4 h-4 mr-2" />
                        Clear Cache
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="w-4 h-4 mr-2" />
                        Export System Logs
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
