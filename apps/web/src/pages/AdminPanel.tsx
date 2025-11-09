import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Users, Calendar, Activity, Database, Plus, Download } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { User } from '../types';

export function AdminPanel() {
  const users: User[] = [
    { id: '1', name: 'Sarah Johnson', email: 'sarah@example.com', role: 'Organizer' },
    { id: '2', name: 'Mike Chen', email: 'mike@example.com', role: 'Organizer' },
    { id: '3', name: 'Emily Davis', email: 'emily@example.com', role: 'Attendee' },
    { id: '4', name: 'John Smith', email: 'john@example.com', role: 'Attendee' },
    { id: '5', name: 'Admin User', email: 'admin@example.com', role: 'Admin' },
  ];

  const getRoleBadgeColor = (role: User['role']) => {
    switch (role) {
      case 'Admin': return 'bg-red-500';
      case 'Organizer': return 'bg-[#0F6AB4]';
      case 'Attendee': return 'bg-[#28A9A1]';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">System management and oversight</p>
      </div>

      {/* System Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Total Users"
          value="1,247"
          icon={Users}
          trend="+23 this week"
          trendUp={true}
          color="#0F6AB4"
        />
        <StatsCard 
          title="Active Events"
          value="34"
          icon={Calendar}
          trend="12 scheduled"
          trendUp={true}
          color="#28A9A1"
        />
        <StatsCard 
          title="System Health"
          value="99.9%"
          icon={Activity}
          trend="All systems operational"
          trendUp={true}
          color="#10B981"
        />
        <StatsCard 
          title="AI Requests Today"
          value="156"
          icon={Database}
          trend="+12% from yesterday"
          trendUp={true}
          color="#8B5CF6"
        />
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="system">System Health</TabsTrigger>
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
                  <Button className="bg-[#0F6AB4] hover:bg-[#0D5A9A]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add User
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
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
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-green-500 text-white">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-600">Remove</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Event Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Total Events</p>
                    <h3 className="text-gray-900">34</h3>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Scheduled</p>
                    <h3 className="text-[#28A9A1]">12</h3>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600 mb-1">Completed</p>
                    <h3 className="text-gray-500">22</h3>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>System Reports</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download User Activity Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download Event Performance Report
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download Financial Summary
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Download className="w-4 h-4 mr-2" />
                  Download AI Usage Statistics
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="mt-6">
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
                    <span className="text-sm">AI Engine</span>
                    <Badge className="bg-green-500 text-white">Operational</Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                    <span className="text-sm">Storage</span>
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
