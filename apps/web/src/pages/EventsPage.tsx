import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Sparkles, ArrowRight, Calendar } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { getEvents, createEvent, parseBrief } from '../api';
import { User } from '../types';

interface EventsPageProps {
  user: User;
}

export function EventsPage({ user }: EventsPageProps) {
  const [events, setEvents] = useState<any[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [eventDetails, setEventDetails] = useState({
    title: '',
    startDate: '',
    endDate: '',
    budget: '',
    expectedAudience: '',
    brief: ''
  });

  const fetchEvents = async () => {
    try {
      const { data } = await getEvents();
      setEvents(data);
    } catch (error) {
      console.error('Failed to fetch events', error);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleAIGenerate = async () => {
    if (!aiInput) return;
    console.log('VITE_AI_BASE:', import.meta.env.VITE_AI_BASE);
    console.log('Calling AI service at:', `${import.meta.env.VITE_AI_BASE}/parse-brief`);
    try {
      const { data: parsed } = await parseBrief({ text: aiInput });
      setEventDetails({
        ...eventDetails,
        brief: aiInput,
        title: parsed?.title || eventDetails.title,
        expectedAudience: parsed?.estimatedAudience || eventDetails.expectedAudience,
        budget: parsed?.budgetLkr ? String(parsed.budgetLkr) : eventDetails.budget,
      });
    } catch (error) {
      console.error('AI parsing failed', error);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEvent({
        ...eventDetails,
        organizerId: user.id,
        expectedAudience: Number(eventDetails.expectedAudience) || undefined,
      });
      setIsDialogOpen(false);
      fetchEvents(); // Refresh the list
      // Reset form
      setEventDetails({
        title: '', startDate: '', endDate: '', budget: '', expectedAudience: '', brief: ''
      });
      setAiInput('');
    } catch (error) {
      console.error('Failed to create event', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Event Management</h1>
          <p className="text-gray-600">Create and manage your events</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0F6AB4] hover:bg-[#0D5A9A]">
              <Plus className="w-4 h-4 mr-2" />
              Create New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateEvent} className="space-y-6 overflow-y-auto pr-2">
              {/* AI Assist Section */}
              <div className="bg-gradient-to-br from-[#0F6AB4]/10 to-[#28A9A1]/10 rounded-lg p-4 border-2 border-dashed border-[#28A9A1]">
                <div className="flex items-start gap-3 mb-3">
                  <Sparkles className="w-5 h-5 text-[#28A9A1] mt-1" />
                  <div className="flex-1">
                    <h4 className="text-gray-900 mb-1">AI Assist</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Describe your event in natural language and let AI generate the details
                    </p>
                    <Textarea
                      placeholder="e.g., '1-day summit for 100 people, 2 tracks, budget 250k LKR'"
                      className="mb-3 bg-white"
                      value={aiInput}
                      onChange={(e) => setAiInput(e.target.value)}
                    />
                    <Button 
                      type="button"
                      onClick={handleAIGenerate}
                      className="bg-[#28A9A1] hover:bg-[#229187]"
                    >
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Details (via AI)
                    </Button>
                  </div>
                </div>
              </div>

              {/* Manual Entry Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="eventName">Event Name</Label>
                  <Input
                    id="eventName"
                    placeholder="Enter event name"
                    value={eventDetails.title}
                    onChange={(e) => setEventDetails({...eventDetails, title: e.target.value})}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={eventDetails.startDate}
                      onChange={(e) => setEventDetails({...eventDetails, startDate: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={eventDetails.endDate}
                      onChange={(e) => setEventDetails({...eventDetails, endDate: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget (LKR)</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="250000"
                      value={eventDetails.budget}
                      onChange={(e) => setEventDetails({...eventDetails, budget: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="audience">Expected Audience</Label>
                    <Input
                      id="audience"
                      type="number"
                      placeholder="100"
                      value={eventDetails.expectedAudience}
                      onChange={(e) => setEventDetails({...eventDetails, expectedAudience: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Brief / Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter event brief or description"
                    value={eventDetails.brief}
                    onChange={(e) => setEventDetails({...eventDetails, brief: e.target.value})}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]">
                Create Event
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <h4 className="text-gray-900">{event.title}</h4>
                    <p className="text-sm text-gray-600">{new Date(event.startDate).toLocaleDateString()} - {new Date(event.endDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">LKR {parseFloat(String(event.budget || 0)).toLocaleString('en-US', { maximumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-500">{event.expectedAudience} attendees</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No events created yet. Click "Create New Event" to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
