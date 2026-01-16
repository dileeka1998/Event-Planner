import { useState, useEffect } from 'react';
import { Plus, Loader2, Trash2, Edit, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Room, Event } from '../types';
import { toast } from 'sonner';
import { getEvents, getEventRooms, createRoom, updateRoom, deleteRoom } from '../api';

export function RoomsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(false);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({
    name: '',
    capacity: 0,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchRooms(selectedEventId);
    } else {
      setRooms([]);
    }
  }, [selectedEventId]);

  const fetchEvents = async () => {
    setEventsLoading(true);
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
    } finally {
      setEventsLoading(false);
    }
  };

  const fetchRooms = async (eventId: number) => {
    setLoading(true);
    try {
      const { data } = await getEventRooms(eventId);
      setRooms(data);
    } catch (error: any) {
      toast.error('Failed to fetch rooms');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setRoomForm({
        name: room.name,
        capacity: room.capacity,
      });
    } else {
      setEditingRoom(null);
      setRoomForm({
        name: '',
        capacity: 0,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRoom(null);
    setRoomForm({
      name: '',
      capacity: 0,
    });
  };

  const handleSubmitRoom = async () => {
    if (!selectedEventId) {
      toast.error('Please select an event first');
      return;
    }

    if (!roomForm.name.trim()) {
      toast.error('Please enter a room name');
      return;
    }

    if (roomForm.capacity < 1) {
      toast.error('Capacity must be at least 1');
      return;
    }

    try {
      if (editingRoom) {
        await updateRoom(selectedEventId, editingRoom.id, roomForm);
        toast.success('Room updated successfully');
      } else {
        await createRoom(selectedEventId, roomForm);
        toast.success('Room created successfully');
      }

      handleCloseDialog();
      if (selectedEventId) {
        await fetchRooms(selectedEventId);
      }
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save room');
      console.error(error);
    }
  };

  const handleDeleteRoom = async (room: Room) => {
    if (!selectedEventId) return;

    if (!confirm(`Are you sure you want to delete "${room.name}"?`)) {
      return;
    }

    try {
      await deleteRoom(selectedEventId, room.id);
      toast.success('Room deleted successfully');
      await fetchRooms(selectedEventId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete room');
      console.error(error);
    }
  };

  const selectedEvent = events.find(e => e.id === selectedEventId);
  const maxCapacity = selectedEvent?.venue?.capacity || selectedEvent?.expectedAudience || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 mb-2">Rooms Management</h1>
          <p className="text-gray-600">Manage rooms for your events</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-[#0F6AB4] hover:bg-[#0D5A9A]"
              onClick={() => handleOpenDialog()}
              disabled={!selectedEventId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Room
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="roomName">Room Name *</Label>
                <Input
                  id="roomName"
                  placeholder="Enter room name (e.g., Room A, Main Hall)"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="capacity">Capacity *</Label>
                <Input
                  id="capacity"
                  type="number"
                  placeholder="100"
                  min="1"
                  max={maxCapacity || undefined}
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 0 })}
                />
                {maxCapacity > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    Max: {maxCapacity} (Venue/Event capacity)
                  </p>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancel
                </Button>
                <Button className="bg-[#0F6AB4] hover:bg-[#0D5A9A]" onClick={handleSubmitRoom}>
                  {editingRoom ? 'Update Room' : 'Add Room'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Event Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="event-select" className="whitespace-nowrap">Select Event:</Label>
            <Select
              value={selectedEventId?.toString() || ''}
              onValueChange={(value) => setSelectedEventId(parseInt(value))}
              disabled={eventsLoading}
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

      {/* Rooms List */}
      <Card>
        <CardHeader>
          <CardTitle>Rooms List</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          ) : !selectedEventId ? (
            <div className="text-center py-12 text-gray-500">
              <p>Please select an event to view and manage rooms.</p>
            </div>
          ) : rooms.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p>No rooms found for this event. Click "Add Room" to create one.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Room Name</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(room)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRoom(room)} className="text-red-600 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
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
