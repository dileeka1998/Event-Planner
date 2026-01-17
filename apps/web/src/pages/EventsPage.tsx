import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Plus, Sparkles, ArrowRight, Calendar as CalendarIcon, MapPin, X, Loader2, Filter, Users, DollarSign, Clock } from 'lucide-react';
import { Calendar as CalendarComponent } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Badge } from '../components/ui/badge';
import { cn } from '../components/ui/utils';
import { buttonVariants } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AIParseLoader } from '../components/ai/AIParseLoader';
import { VenueCard } from '../components/venue/VenueCard';
import { Venue, Event } from '../types';
import { toast } from 'sonner';
import { getVenues, createVenue, createEvent, getEvents, parseBrief } from '../api';

interface EventsPageProps {
  onNavigate?: (page: string) => void;
}

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

export function EventsPage({ onNavigate }: EventsPageProps = {}) {
  const [showAIResult, setShowAIResult] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<Venue | null>(null);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [allEvents, setAllEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [venuesLoading, setVenuesLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [showCalendar, setShowCalendar] = useState(false);
  
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
      const processedEvents = data.map((e: any) => ({
        ...e,
        name: e.title,
        dateRange: e.startDate === e.endDate 
          ? new Date(e.startDate).toLocaleDateString()
          : `${new Date(e.startDate).toLocaleDateString()} - ${new Date(e.endDate).toLocaleDateString()}`,
        budget: parseFloat(e.budget || '0'),
        description: e.description || '',
      }));
      setAllEvents(processedEvents);
      // Filter to show only upcoming events by default (no date filter)
      filterEvents(processedEvents, undefined);
    } catch (error: any) {
      toast.error('Failed to fetch events');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const filterEvents = (eventsToFilter: Event[], filterDate: Date | undefined) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (filterDate) {
      // Normalize filter date to start of day
      const normalizedFilterDate = new Date(filterDate);
      normalizedFilterDate.setHours(0, 0, 0, 0);
      const filterDateStr = normalizedFilterDate.toISOString().split('T')[0];
      
      // Filter events that occur on the selected date
      const filtered = eventsToFilter.filter(event => {
        const eventStart = new Date(event.startDate);
        const eventEnd = new Date(event.endDate);
        eventStart.setHours(0, 0, 0, 0);
        eventEnd.setHours(23, 59, 59, 999);
        
        // Check if filter date falls within event date range using time comparison
        const filterTime = normalizedFilterDate.getTime();
        const startTime = eventStart.getTime();
        const endTime = eventEnd.getTime();
        
        const isInRange = filterTime >= startTime && filterTime <= endTime;
        return isInRange;
      });
      setEvents(filtered);
    } else {
      // Show only upcoming events (startDate >= today)
      const upcoming = eventsToFilter.filter(event => {
        const eventStart = new Date(event.startDate);
        eventStart.setHours(0, 0, 0, 0);
        return eventStart >= today;
      });
      setEvents(upcoming);
    }
  };

  useEffect(() => {
    if (allEvents.length > 0) {
      filterEvents(allEvents, selectedDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const getEventStatus = (event: Event): 'upcoming' | 'ongoing' | 'past' => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(event.startDate);
    const endDate = new Date(event.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    if (endDate < today) return 'past';
    if (startDate <= today && endDate >= today) return 'ongoing';
    return 'upcoming';
  };

  const getStatusColor = (status: 'upcoming' | 'ongoing' | 'past') => {
    switch (status) {
      case 'upcoming': return 'bg-[#0F6AB4]';
      case 'ongoing': return 'bg-[#28A9A1]';
      case 'past': return 'bg-gray-400';
    }
  };

  const getStatusLabel = (status: 'upcoming' | 'ongoing' | 'past') => {
    switch (status) {
      case 'upcoming': return 'Upcoming';
      case 'ongoing': return 'Ongoing';
      case 'past': return 'Past';
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

    // Validate that start date is not in the past
    const startDate = new Date(eventDetails.startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    startDate.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      toast.error('Start date cannot be in the past');
      return;
    }

    // Validate that start date is not after end date
    const endDate = new Date(eventDetails.endDate);
    if (startDate > endDate) {
      toast.error('Start date cannot be after end date');
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
                      min={new Date().toISOString().split('T')[0]}
                      max={eventDetails.endDate || undefined}
                      onChange={(e) => setEventDetails({...eventDetails, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date *</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={eventDetails.endDate}
                      min={eventDetails.startDate || new Date().toISOString().split('T')[0]}
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{selectedDate ? 'Filtered Events' : 'Upcoming Events'}</CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {selectedDate 
                  ? `Showing events on ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                  : `${events.length} ${events.length === 1 ? 'event' : 'events'} scheduled`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 border-[#0F6AB4] text-[#0F6AB4] hover:bg-[#0F6AB4] hover:text-white">
                    <Filter className="w-4 h-4" />
                    {selectedDate ? selectedDate.toLocaleDateString() : 'Filter by Date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="end">
                  <div className="p-3 bg-gradient-to-br from-gray-50 to-gray-100/50 border-b">
                    <h4 className="text-sm font-semibold text-gray-900 mb-1">Select Date</h4>
                    <p className="text-xs text-gray-500">Choose a date to filter events</p>
                  </div>
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      if (date) {
                        // Normalize date to start of day for consistent comparison
                        const normalizedDate = new Date(date);
                        normalizedDate.setHours(0, 0, 0, 0);
                        
                        // Always set the date and apply filter
                        setSelectedDate(normalizedDate);
                        // Apply filter immediately
                        filterEvents(allEvents, normalizedDate);
                      } else {
                        // If date is undefined and we have a selectedDate, keep it selected
                        // This prevents deselection when clicking the same date
                        if (selectedDate) {
                          // Re-apply filter with current selected date
                          filterEvents(allEvents, selectedDate);
                        } else {
                          // Only clear if there was no selection
                          setSelectedDate(undefined);
                          filterEvents(allEvents, undefined);
                        }
                      }
                      // Close calendar after a short delay
                      setTimeout(() => setShowCalendar(false), 200);
                    }}
                    className="rounded-md border-0 p-4"
                    classNames={{
                      caption: "flex justify-center pt-1 relative items-center mb-4",
                      caption_label: "text-base font-semibold text-gray-900",
                      nav: "flex items-center gap-1",
                      nav_button: cn(
                        buttonVariants({ variant: "outline" }),
                        "h-7 w-7 bg-white border-gray-300 hover:bg-gray-50 hover:border-gray-400"
                      ),
                      nav_button_previous: "absolute left-1",
                      nav_button_next: "absolute right-1",
                      head_row: "flex mb-2",
                      head_cell: "text-gray-600 rounded-md w-10 font-semibold text-xs uppercase tracking-wide",
                      row: "flex w-full mt-1",
                      cell: "relative p-0 text-center text-sm focus-within:relative focus-within:z-20",
                      day: cn(
                        buttonVariants({ variant: "ghost" }),
                        "h-10 w-10 p-0 font-normal hover:bg-gray-100 rounded-lg transition-colors"
                      ),
                      day_selected: "bg-[#0F6AB4] text-white hover:bg-[#0D5A9A] hover:text-white focus:bg-[#0F6AB4] focus:text-white font-semibold",
                      day_today: "bg-[#28A9A1]/10 text-[#28A9A1] font-semibold border border-[#28A9A1]/30",
                    }}
                  />
                  {selectedDate && (
                    <div className="p-3 border-t bg-gray-50">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => {
                          setSelectedDate(undefined);
                          filterEvents(allEvents, undefined);
                          setShowCalendar(false);
                        }}
                      >
                        Clear Filter
                      </Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gray-100 mb-4">
                <CalendarIcon className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {selectedDate 
                  ? `No events found for ${selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`
                  : 'No upcoming events'}
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                {selectedDate 
                  ? 'Try selecting a different date or clear the filter to see all upcoming events.'
                  : 'Click "Create New Event" to get started with your first event.'}
              </p>
              {selectedDate && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => {
                    setSelectedDate(undefined);
                    filterEvents(allEvents, undefined);
                  }}
                >
                  <X className="w-4 h-4" />
                  Clear Filter
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {events.map((event) => {
                const status = getEventStatus(event);
                return (
                  <div 
                    key={event.id}
                    onClick={() => {
                      // Store eventId in localStorage for SpeakersPage to use
                      localStorage.setItem('selectedEventId', event.id.toString());
                      if (onNavigate) {
                        onNavigate('speakers');
                      }
                    }}
                    className="group relative p-5 bg-white rounded-xl border border-gray-200 hover:border-[#0F6AB4] hover:shadow-lg transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3 mb-3">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] flex items-center justify-center">
                            <CalendarIcon className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-lg font-semibold text-gray-900 group-hover:text-[#0F6AB4] transition-colors">
                                {event.name || event.title}
                              </h4>
                              <Badge className={`${getStatusColor(status)} text-white text-xs`}>
                                {getStatusLabel(status)}
                              </Badge>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="font-medium">{event.dateRange}</span>
                              </div>
                              {event.venue && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                  <MapPin className="w-4 h-4 text-[#28A9A1]" />
                                  <span>{event.venue.name}</span>
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                  <Users className="w-3.5 h-3.5" />
                                  <span>{event.expectedAudience || 0} expected attendees</span>
                                </div>
                                {event.attendees && event.attendees.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[#28A9A1] font-medium">
                                      {event.attendees.filter((a: any) => a.status === 'CONFIRMED').length} confirmed
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className="bg-gradient-to-br from-[#0F6AB4]/10 to-[#28A9A1]/10 rounded-lg p-3 border border-[#0F6AB4]/20">
                          <div className="flex items-center gap-1 mb-1">
                            <DollarSign className="w-4 h-4 text-[#0F6AB4]" />
                            <p className="text-sm font-semibold text-[#0F6AB4]">
                              LKR {event.budget?.toLocaleString() || '0'}
                            </p>
                          </div>
                          <p className="text-xs text-gray-500">Budget</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
