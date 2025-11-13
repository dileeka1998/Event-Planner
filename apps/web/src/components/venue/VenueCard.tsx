import { MapPin, Users, DollarSign, Phone } from 'lucide-react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Venue } from '../../types';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface VenueCardProps {
  venue: Venue;
  onBook?: (venue: Venue) => void;
  onEdit?: (venue: Venue) => void;
  onDelete?: (id: number) => void;
  compact?: boolean;
}

export function VenueCard({ venue, onBook, onEdit, onDelete, compact = false }: VenueCardProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
        <div className="flex-1">
          <h4 className="text-gray-900 mb-1">{venue.name}</h4>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {venue.location}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {venue.capacity}
            </span>
          </div>
        </div>
        <div className="text-right">
          {venue.hourlyRate && (
            <p className="text-sm text-gray-900">
              LKR {typeof venue.hourlyRate === 'string' 
                ? parseFloat(venue.hourlyRate).toLocaleString() 
                : venue.hourlyRate.toLocaleString()}/hr
            </p>
          )}
          {onBook && (
            <Button size="sm" onClick={() => onBook(venue)} className="mt-2 bg-[#0F6AB4] hover:bg-[#0D5A9A]">
              Select
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] relative">
        {venue.imageUrl ? (
          <ImageWithFallback 
            src={venue.imageUrl} 
            alt={venue.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MapPin className="w-16 h-16 text-white opacity-50" />
          </div>
        )}
        <div className="absolute top-3 right-3">
          <Badge className="bg-white text-gray-900">
            {venue.capacity} capacity
          </Badge>
        </div>
      </div>
      <CardContent className="p-4">
        <h3 className="text-gray-900 mb-2">{venue.name}</h3>
        
        <div className="space-y-2 mb-4">
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{venue.address}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="w-4 h-4 flex-shrink-0" />
            <span>{venue.contact}</span>
          </div>
          {venue.hourlyRate && (
            <div className="flex items-center gap-2 text-sm text-gray-900">
              <DollarSign className="w-4 h-4 flex-shrink-0" />
              <span>
                LKR {typeof venue.hourlyRate === 'string' 
                  ? parseFloat(venue.hourlyRate).toLocaleString() 
                  : venue.hourlyRate.toLocaleString()} per hour
              </span>
            </div>
          )}
        </div>

        {venue.amenities && venue.amenities.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {venue.amenities.map((amenity, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {amenity}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {onBook && (
            <Button 
              onClick={() => onBook(venue)} 
              className="flex-1 bg-[#0F6AB4] hover:bg-[#0D5A9A]"
            >
              Book Venue
            </Button>
          )}
          {onEdit && (
            <Button 
              onClick={() => onEdit(venue)} 
              variant="outline"
              className="flex-1"
            >
              Edit
            </Button>
          )}
          {onDelete && (
            <Button 
              onClick={() => onDelete(venue.id)} 
              variant="outline"
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              Delete
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
