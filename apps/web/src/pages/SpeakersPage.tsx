import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Upload } from 'lucide-react';
import { Session } from '../types';

export function SpeakersPage() {
  const [sessions] = useState<Session[]>([
    { 
      id: '1', 
      title: 'AI in Modern Applications', 
      speaker: 'Dr. Sarah Chen', 
      track: 'Technology',
      duration: 60,
      expectedAudience: 150
    },
    { 
      id: '2', 
      title: 'Future of Web Development', 
      speaker: 'John Martinez', 
      track: 'Development',
      duration: 45,
      expectedAudience: 120
    },
    { 
      id: '3', 
      title: 'Cloud Architecture Patterns', 
      speaker: 'Emily Watson', 
      track: 'Technology',
      duration: 90,
      expectedAudience: 80
    },
  ]);

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
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-[#0F6AB4] hover:bg-[#0D5A9A]">
                <Plus className="w-4 h-4 mr-2" />
                Add Session
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Session</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="sessionTitle">Session Title</Label>
                  <Input id="sessionTitle" placeholder="Enter session title" />
                </div>
                <div>
                  <Label htmlFor="speaker">Speaker Name</Label>
                  <Input id="speaker" placeholder="Enter speaker name" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="track">Track</Label>
                    <Input id="track" placeholder="e.g., Technology" />
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (min)</Label>
                    <Input id="duration" type="number" placeholder="60" />
                  </div>
                </div>
                <div>
                  <Label htmlFor="expectedAudience">Expected Audience</Label>
                  <Input id="expectedAudience" type="number" placeholder="100" />
                </div>
                <Button className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]">
                  Add Session
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Session List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Speaker</TableHead>
                <TableHead>Track</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Expected Audience</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>{session.title}</TableCell>
                  <TableCell>{session.speaker}</TableCell>
                  <TableCell>
                    <span className="px-2 py-1 bg-[#0F6AB4]/10 text-[#0F6AB4] rounded text-xs">
                      {session.track}
                    </span>
                  </TableCell>
                  <TableCell>{session.duration} min</TableCell>
                  <TableCell>{session.expectedAudience}</TableCell>
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
