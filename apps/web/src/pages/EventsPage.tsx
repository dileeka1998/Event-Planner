import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Sparkles, ArrowRight, Calendar, MapPin, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AIParseLoader } from '../components/ai/AIParseLoader';
import { VenueCard } from '../components/venue/VenueCard';
import { Venue, Event } from '../types';
import { toast } from 'sonner';
import { getVenues, createVenue, createEvent, getEvents, parseBrief } from '../api';

// Simple JWT decode to get user ID
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

// Parse date range string to startDate and endDate
function parseDateRange(dateRange: string): { startDate: string; endDate: string } | null {
  // Try various formats: "2025-06-15 to 2025-06-16", "Mar 15-16, 2025", "2025-06-15"
  const toMatch = dateRange.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-)?\s*(\d{4}-\d{2}-\d{2})?/);
  if (toMatch) {
    return {
      startDate: toMatch[1],
      endDate: toMatch[2] || toMatch[1],
    };
  }
  // Try single date
  const singleDate = dateRange.match(/(\d{4}-\d{2}-\d{2})/);
  if (singleDate) {
    return {
      startDate: singleDate[1],
      endDate: singleDate[1],
    };
  }
  return null;
}

export function EventsPage() {
  const [showAIResult, setShowAIResult] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [venuesLoading, setVenuesLoading] = useState(false);
  
  const [eventDetails, setEventDetails] = useState({
    name: '',
    startDate: '',
    endDate: '',
    budget: '',
    expectedAudience: '',
    description: '',
    brief: '',
  });

  const [newVenue, setNewVenue] = useState({
    name: '',
    address: '',
    capacity: 0,
    hourlyRate: '',
    contactName: '',
    contactPhone: '',
    location: '',
  });

  useEffect(() => {
    fetchVenues();
    fetchEvents();
  }, []);

  const fetchVenues = async () => {
    setVenuesLoading(true);
    try {
      const { data } = await getVenues();
      setVenues(data.map((v: any) => ({
        ...v,
        contact: v.contactPhone || v.contactName || '',
        location: v.address?.split(',')?.pop()?.trim() || '',
      })));
    } catch (error: any) {
      toast.error('Failed to fetch venues');
      console.error(error);
    } finally {
      setVenuesLoading(false);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const { data } = await getEvents();
      setEvents(data.map((e: any) => ({
        ...e,
        name: e.title,
        dateRange: e.startDate === e.endDate 
          ? new Date(e.startDate).toLocaleDateString()
          : `${new Date(e.startDate).toLocaleDateString()} - ${new Date(e.endDate).toLocaleDateString()}`,
        budget: parseFloat(e.budget || '0'),
        description: e.description || '',
      })));
    } catch (error: any) {
      toast.error('Failed to fetch events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAIGenerate = async () => {
    if (!aiInput.trim()) {
      toast.error('Please describe your event');
      return;
    }

    setIsParsing(true);
    try {
      const { data } = await parseBrief({ text: aiInput });
      setShowAIResult(true);
      setEventDetails({
        ...eventDetails,
        brief: aiInput,
        name: data.title || eventDetails.name,
        expectedAudience: data.estimatedAudience?.toString() || eventDetails.expectedAudience,
        budget: data.budgetLkr?.toString() || eventDetails.budget,
      });
      toast.success('AI suggestions applied successfully!');
    } catch (error: any) {
      toast.error('AI parsing failed. Please try again.');
      console.error(error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSelectVenue = (venue: Venue) => {
    setSelectedVenue(venue);
    toast.success(`Venue "${venue.name}" selected`);
  };

  const handleAddNewVenue = async () => {
    if (!newVenue.name || !newVenue.address || newVenue.capacity === 0) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const { data } = await createVenue({
        name: newVenue.name,
        address: newVenue.address,
        capacity: newVenue.capacity,
        hourlyRate: newVenue.hourlyRate || undefined,
        contactName: newVenue.contactName || undefined,
        contactPhone: newVenue.contactPhone || undefined,
        notes: newVenue.location ? `Location: ${newVenue.location}` : undefined,
      });
      await fetchVenues();
      setSelectedVenue({
        ...data,
        contact: data.contactPhone || data.contactName || '',
        location: data.address?.split(',')?.pop()?.trim() || '',
      });
      setIsAddVenueOpen(false);
      setNewVenue({
        name: '',
        address: '',
        capacity: 0,
        hourlyRate: '',
        contactName: '',
        contactPhone: '',
        location: '',
      });
      toast.success('Venue added and selected!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create venue');
    }
  };

  const handleCreateEvent = async () => {
    const userId = getUserId();
    if (!userId) {
      toast.error('Please login to create events');
      return;
    }

    if (!eventDetails.name || !eventDetails.startDate || !eventDetails.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Debug: log what we're sending
    console.log('Creating event with:', {
      expectedAudience: eventDetails.expectedAudience,
      venueId: selectedVenue?.id,
      brief: eventDetails.brief,
    });

    try {
      await createEvent({
        organizerId: userId,
        title: eventDetails.name,
        startDate: eventDetails.startDate,
        endDate: eventDetails.endDate,
        // Ensure we send the number, not undefined
        expectedAudience: eventDetails.expectedAudience 
          ? parseInt(eventDetails.expectedAudience, 10) 
          : undefined,
        budget: eventDetails.budget || undefined,
        venueId: selectedVenue?.id,
        brief: eventDetails.brief || undefined,
      });
      setIsDialogOpen(false);
      setEventDetails({
        name: '',
        startDate: '',
        endDate: '',
        budget: '',
        expectedAudience: '',
        description: '',
        brief: '',
      });
      setSelectedVenue(null);
      setAiInput('');
      setShowAIResult(false);
      await fetchEvents();
      toast.success('Event created successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to create event');
    }
  };

  const filteredVenues = venues.filter(v => {
    if (!eventDetails.expectedAudience) return true;
    return v.capacity >= parseInt(eventDetails.expectedAudience);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Event Management</h1>
          <p className="text-gray-600">Create and manage your events with AI assistance</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#0F6AB4] hover:bg-[#0D5A9A]">
              <Plus className="w-4 h-4 mr-2" />
              Create New Event
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create New Event</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 overflow-y-auto pr-2">
              {/* AI Assist Section */}
              <div className="bg-gradient-to-br from-[#0F6AB4]/10 to-[#28A9A1]/10 rounded-lg p-4 border-2 border-dashed border-[#28A9A1]">
                <div className="flex items-start gap-3 mb-3">
                  <Sparkles className="w-5 h-5 text-[#28A9A1] mt-1" />
                  <div className="flex-1">
                    <h4 className="text-gray-900 mb-1">AI Assist - Powered by spaCy</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Describe your event in natural language and let AI parse the details
                    </p>
                    {isParsing ? (
                      <AIParseLoader message="AI is parsing your event description..." />
                    ) : (
                      <>
                        <Textarea
                          placeholder="e.g., '1-day tech summit for 100 people in Colombo, 2 tracks, budget 250k LKR, need audio-visual equipment'"
                          className="mb-3 bg-white"
                          value={aiInput}
                          onChange={(e) => setAiInput(e.target.value)}
                        />
                        <Button 
                          onClick={handleAIGenerate}
                          className="bg-[#28A9A1] hover:bg-[#229187]"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          Parse & Suggest
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {showAIResult && !isParsing && (
                  <Alert className="mt-3 bg-white border-[#28A9A1]">
                    <Sparkles className="w-4 h-4 text-[#28A9A1]" />
                    <AlertDescription>
                      ✅ AI suggestions applied! Review and edit the details below.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Manual Entry Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="eventName">Event Name *</Label>
                  <Input
                    id="eventName"
                    placeholder="Enter event name"
                    value={eventDetails.name}
                    onChange={(e) => setEventDetails({...eventDetails, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date *</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={eventDetails.startDate}
                      onChange={(e) => setEventDetails({...eventDetails, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={eventDetails.endDate}
                      onChange={(e) => setEventDetails({...eventDetails, endDate: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="budget">Budget (LKR) *</Label>
                    <Input
                      id="budget"
                      type="number"
                      placeholder="250000"
                      value={eventDetails.budget}
                      onChange={(e) => setEventDetails({...eventDetails, budget: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="audience">Expected Audience *</Label>
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
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Enter event description"
                    value={eventDetails.description}
                    onChange={(e) => setEventDetails({...eventDetails, description: e.target.value})}
                  />
                </div>
              </div>

              {/* Venue Picker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Select Venue</Label>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setIsAddVenueOpen(!isAddVenueOpen)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add New Venue
                  </Button>
                </div>

                {selectedVenue && (
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-green-600" />
                      <span className="text-sm">Selected: {selectedVenue.name}</span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedVenue(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {isAddVenueOpen && (
                  <Card className="border-[#0F6AB4]">
                    <CardContent className="p-4 space-y-3">
                      <h4 className="text-gray-900">Quick Add Venue</h4>
                      <div className="grid grid-cols-2 gap-3">
                        <Input 
                          placeholder="Venue Name *"
                          value={newVenue.name}
                          onChange={(e) => setNewVenue({...newVenue, name: e.target.value})}
                        />
                        <Input 
                          placeholder="Location"
                          value={newVenue.location}
                          onChange={(e) => setNewVenue({...newVenue, location: e.target.value})}
                        />
                      </div>
                      <Input 
                        placeholder="Address *"
                        value={newVenue.address}
                        onChange={(e) => setNewVenue({...newVenue, address: e.target.value})}
                      />
                      <div className="grid grid-cols-3 gap-3">
                        <Input 
                          type="number"
                          placeholder="Capacity *"
                          value={newVenue.capacity || ''}
                          onChange={(e) => setNewVenue({...newVenue, capacity: parseInt(e.target.value) || 0})}
                        />
                        <Input 
                          type="number"
                          placeholder="Rate/hr (LKR)"
                          value={newVenue.hourlyRate}
                          onChange={(e) => setNewVenue({...newVenue, hourlyRate: e.target.value})}
                        />
                        <Input 
                          placeholder="Contact Phone"
                          value={newVenue.contactPhone}
                          onChange={(e) => setNewVenue({...newVenue, contactPhone: e.target.value})}
                        />
                      </div>
                      <Input 
                        placeholder="Contact Name"
                        value={newVenue.contactName}
                        onChange={(e) => setNewVenue({...newVenue, contactName: e.target.value})}
                      />
                      <Button 
                        onClick={handleAddNewVenue}
                        className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                      >
                        Add & Select Venue
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {venuesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                      {filteredVenues.map((venue) => (
                        <VenueCard 
                          key={venue.id}
                          venue={venue}
                          onBook={handleSelectVenue}
                          compact
                        />
                      ))}
                    </div>
                    {filteredVenues.length === 0 && eventDetails.expectedAudience && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        No venues available for {eventDetails.expectedAudience} attendees. Try adding a new venue.
                      </p>
                    )}
                  </>
                )}
              </div>

              {showAIResult && (
                <div className="bg-[#28A9A1]/10 rounded-lg p-4">
                  <h4 className="text-gray-900 mb-2">Structured Event Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Event Name:</span>
                      <span>{eventDetails.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dates:</span>
                      <span>{eventDetails.startDate && eventDetails.endDate ? `${eventDetails.startDate} to ${eventDetails.endDate}` : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Budget:</span>
                      <span>LKR {eventDetails.budget ? Number(eventDetails.budget).toLocaleString() : 'Not set'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Expected Attendees:</span>
                      <span>{eventDetails.expectedAudience || 'Not set'}</span>
                    </div>
                    {selectedVenue && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Venue:</span>
                        <span>{selectedVenue.name}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button 
                onClick={handleCreateEvent}
                className="w-full bg-[#0F6AB4] hover:bg-[#0D5A9A]"
              >
                Create Event
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No events created yet. Click "Create New Event" to get started.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <div 
                  key={event.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="text-gray-900 font-medium">{event.name || event.title}</h4>
                    <p className="text-sm text-gray-600">{event.dateRange}</p>
                    {event.venue && (
                      <p className="text-xs text-gray-500 mt-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {event.venue.name}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-900">LKR {event.budget?.toLocaleString() || '0'}</p>
                    <p className="text-xs text-gray-500">{event.expectedAudience} attendees</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
