import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Upload, Loader2 } from 'lucide-react';
import { Session, Event } from '../types';
import { getEvents } from '../api';
import { toast } from 'sonner';

export function SpeakersPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data: events } = await getEvents();
      const allSessions: Session[] = [];
      events.forEach((event: Event) => {
        if (event.sessions) {
          allSessions.push(...event.sessions.map((s: any) => ({
            ...s,
            expectedAudience: event.expectedAudience,
            duration: s.durationMin,
          })));
        }
      });
      setSessions(allSessions);
    } catch (error: any) {
      toast.error('Failed to fetch sessions');
      console.error(error);
    } finally {
      setLoading(false);
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
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No sessions found. Sessions will appear here once events are created with sessions.</p>
            </div>
          ) : (
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
                    <TableCell>{session.speaker || '-'}</TableCell>
                    <TableCell>
                      <span className="px-2 py-1 bg-[#0F6AB4]/10 text-[#0F6AB4] rounded text-xs">
                        {session.topic || 'General'}
                      </span>
                    </TableCell>
                    <TableCell>{session.durationMin || session.duration} min</TableCell>
                    <TableCell>{session.expectedAudience || '-'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">Edit</Button>
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
