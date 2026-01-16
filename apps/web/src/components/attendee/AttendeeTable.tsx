import { Search, Download, UserPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Attendee } from '../../types';
import { useState } from 'react';

interface AttendeeTableProps {
  attendees: Attendee[];
  onAddAttendee?: () => void;
  onRemoveAttendee?: (id: number) => void;
  onExport?: () => void;
  showActions?: boolean;
}

export function AttendeeTable({ 
  attendees, 
  onAddAttendee, 
  onRemoveAttendee, 
  onExport,
  showActions = true 
}: AttendeeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredAttendees = attendees.filter(attendee => 
    attendee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attendee.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Attendee['status']) => {
    switch (status) {
      case 'CONFIRMED':
      case 'Confirmed': return 'bg-green-500';
      case 'WAITLISTED':
      case 'Waitlisted': return 'bg-[#F9B233]';
      case 'CANCELLED':
      case 'Cancelled': return 'bg-red-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusDisplay = (status: Attendee['status']) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmed';
      case 'WAITLISTED': return 'Waitlisted';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const getStatusCount = (status: Attendee['status']) => {
    return attendees.filter(a => 
      a.status === status || 
      (status === 'Confirmed' && a.status === 'CONFIRMED') ||
      (status === 'Waitlisted' && a.status === 'WAITLISTED') ||
      (status === 'Cancelled' && a.status === 'CANCELLED')
    ).length;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search attendees by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {onExport && (
            <Button variant="outline" onClick={onExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          )}
          {onAddAttendee && (
            <Button onClick={onAddAttendee} className="bg-[#0F6AB4] hover:bg-[#0D5A9A]">
              <UserPlus className="w-4 h-4 mr-2" />
              Add Attendee
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="text-gray-600">Confirmed: {getStatusCount('Confirmed')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-[#F9B233]"></div>
          <span className="text-gray-600">Waitlisted: {getStatusCount('Waitlisted')}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span className="text-gray-600">Cancelled: {getStatusCount('Cancelled')}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left p-3 text-sm text-gray-600">Name</th>
              <th className="text-left p-3 text-sm text-gray-600">Email</th>
              <th className="text-left p-3 text-sm text-gray-600">Status</th>
              <th className="text-left p-3 text-sm text-gray-600">Joined At</th>
            </tr>
          </thead>
          <tbody>
            {filteredAttendees.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">
                  {searchTerm ? 'No attendees found matching your search' : 'No attendees registered yet'}
                </td>
              </tr>
            ) : (
              filteredAttendees.map((attendee) => (
                <tr key={attendee.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="p-3 text-sm text-gray-900">{attendee.name}</td>
                  <td className="p-3 text-sm text-gray-600">{attendee.email}</td>
                  <td className="p-3">
                    <Badge className={`${getStatusColor(attendee.status)} text-white text-xs`}>
                      {getStatusDisplay(attendee.status)}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm text-gray-600">
                    {new Date(attendee.joinedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
