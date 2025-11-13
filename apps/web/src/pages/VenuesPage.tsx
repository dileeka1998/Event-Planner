import { useState, useEffect } from 'react';
import { Search, Plus, MapPin, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { VenueCard } from '../components/venue/VenueCard';
import { Venue } from '../types';
import { toast } from 'sonner';
import { getVenues, createVenue, updateVenue, deleteVenue } from '../api';

export function VenuesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('all');
  const [isAddVenueOpen, setIsAddVenueOpen] = useState(false);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null);

  const [newVenue, setNewVenue] = useState({
    name: '',
    address: '',
    capacity: 0,
    hourlyRate: '',
    contactName: '',
    contactPhone: '',
    notes: '',
  });

  useEffect(() => {
    fetchVenues();
  }, []);

  const fetchVenues = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  const handleAddVenue = async () => {
    if (!newVenue.name || !newVenue.address || newVenue.capacity === 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingVenue) {
        await updateVenue(editingVenue.id, newVenue);
        toast.success('Venue updated successfully!');
      } else {
        await createVenue(newVenue);
        toast.success('Venue added successfully!');
      }
      await fetchVenues();
      setNewVenue({
        name: '',
        address: '',
        capacity: 0,
        hourlyRate: '',
        contactName: '',
        contactPhone: '',
        notes: '',
      });
      setEditingVenue(null);
      setIsAddVenueOpen(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save venue');
    }
  };

  const handleDeleteVenue = async (id: number) => {
    if (!confirm('Are you sure you want to delete this venue?')) {
      return;
    }
    try {
      await deleteVenue(id);
      await fetchVenues();
      toast.success('Venue deleted successfully');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete venue');
    }
  };

  const handleEditVenue = (venue: Venue) => {
    setEditingVenue(venue);
    setNewVenue({
      name: venue.name,
      address: venue.address,
      capacity: venue.capacity,
      hourlyRate: venue.hourlyRate || '',
      contactName: venue.contactName || '',
      contactPhone: venue.contactPhone || '',
      notes: venue.notes || '',
    });
    setIsAddVenueOpen(true);
  };

  const filteredVenues = venues.filter(venue => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (venue.location || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCapacity = capacityFilter === 'all' ||
      (capacityFilter === 'small' && venue.capacity <= 100) ||
      (capacityFilter === 'medium' && venue.capacity > 100 && venue.capacity <= 300) ||
      (capacityFilter === 'large' && venue.capacity > 300);

    return matchesSearch && matchesCapacity;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Venue Management</h1>
        <p className="text-gray-600">Manage event venues and locations</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input 
                placeholder="Search venues by name or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={capacityFilter} onValueChange={setCapacityFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by capacity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Capacities</SelectItem>
                <SelectItem value="small">Small (≤100)</SelectItem>
                <SelectItem value="medium">Medium (101-300)</SelectItem>
                <SelectItem value="large">Large (300+)</SelectItem>
              </SelectContent>
            </Select>
            <Dialog 
              open={isAddVenueOpen} 
              onOpenChange={(open) => {
                setIsAddVenueOpen(open);
                if (!open) {
                  setEditingVenue(null);
                  setNewVenue({
                    name: '',
                    address: '',
                    capacity: 0,
                    hourlyRate: '',
                    contactName: '',
                    contactPhone: '',
                    notes: '',
                  });
                }
              }}
            >
              <DialogTrigger asChild>
                <Button className="bg-[#0F6AB4] hover:bg-[#0D5A9A]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Venue
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingVenue ? 'Edit Venue' : 'Add New Venue'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Venue Name *</Label>
                      <Input 
                        id="name"
                        value={newVenue.name}
                        onChange={(e) => setNewVenue({ ...newVenue, name: e.target.value })}
                        placeholder="e.g., Grand Ballroom"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="address">Address *</Label>
                      <Input 
                        id="address"
                        value={newVenue.address}
                        onChange={(e) => setNewVenue({ ...newVenue, address: e.target.value })}
                        placeholder="Full address"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="capacity">Capacity *</Label>
                      <Input 
                        id="capacity"
                        type="number"
                        value={newVenue.capacity || ''}
                        onChange={(e) => setNewVenue({ ...newVenue, capacity: parseInt(e.target.value) || 0 })}
                        placeholder="Number of people"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate (LKR)</Label>
                      <Input 
                        id="hourlyRate"
                        type="number"
                        value={newVenue.hourlyRate}
                        onChange={(e) => setNewVenue({ ...newVenue, hourlyRate: e.target.value })}
                        placeholder="Cost per hour"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input 
                        id="contactName"
                        value={newVenue.contactName}
                        onChange={(e) => setNewVenue({ ...newVenue, contactName: e.target.value })}
                        placeholder="Contact person name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactPhone">Contact Phone</Label>
                      <Input 
                        id="contactPhone"
                        value={newVenue.contactPhone}
                        onChange={(e) => setNewVenue({ ...newVenue, contactPhone: e.target.value })}
                        placeholder="Phone number"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Input 
                      id="notes"
                      value={newVenue.notes}
                      onChange={(e) => setNewVenue({ ...newVenue, notes: e.target.value })}
                      placeholder="Additional notes"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setIsAddVenueOpen(false);
                        setEditingVenue(null);
                        setNewVenue({
                          name: '',
                          address: '',
                          capacity: 0,
                          hourlyRate: '',
                          contactName: '',
                          contactPhone: '',
                          notes: '',
                        });
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleAddVenue}
                      className="bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                    >
                      {editingVenue ? 'Update Venue' : 'Add Venue'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVenues.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-12 text-center">
                <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-gray-900 mb-2">No venues found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || capacityFilter !== 'all' 
                    ? 'Try adjusting your search filters' 
                    : 'Get started by adding your first venue'}
                </p>
                {!searchTerm && capacityFilter === 'all' && (
                  <Button 
                    onClick={() => setIsAddVenueOpen(true)}
                    className="bg-[#0F6AB4] hover:bg-[#0D5A9A]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Venue
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            filteredVenues.map((venue) => (
              <VenueCard 
                key={venue.id}
                venue={venue}
                onEdit={handleEditVenue}
                onDelete={handleDeleteVenue}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
