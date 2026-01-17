import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Clock, MapPin, User, Grid3x3, List, Sparkles, Calendar, ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { Session } from '../types';
import { getRecommendedSessions } from '../api';
import { toast } from 'sonner';
import { SESSION_TOPICS } from '../constants/topics';

interface RecommendationsPageProps {
  onNavigate?: (page: string) => void;
}

export function RecommendationsPage({ onNavigate }: RecommendationsPageProps = {}) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [showAll, setShowAll] = useState(false);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 0 });

  useEffect(() => {
    fetchAllSessions();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [selectedTopic, selectedDay, selectedTrack, currentPage, pageSize]);

  const fetchAllSessions = async () => {
    try {
      const { data } = await getRecommendedSessions({ showAll: true, limit: 1000 });
      // Handle both old format (array) and new format (object with data property)
      const sessionsData = Array.isArray(data) ? data : (data?.data || []);
      const processedSessions: Session[] = sessionsData.map((s: any) => ({
        ...s,
        time: s.startTime ? new Date(s.startTime).toLocaleTimeString() : undefined,
        room: s.room?.name || null,
        expectedAudience: s.event?.expectedAudience,
        isEventRegistered: s.isEventRegistered,
        eventRegistrationStatus: s.eventRegistrationStatus,
        eventId: s.eventId,
      }));
      setAllSessions(processedSessions);
    } catch (error: any) {
      console.error('Failed to fetch all sessions for filters', error);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const filters: { topic?: string; day?: string; track?: string; showAll?: boolean; page?: number; limit?: number } = {};
      if (selectedTopic !== 'all') filters.topic = selectedTopic;
      if (selectedDay !== 'all') filters.day = selectedDay;
      if (selectedTrack !== 'all') filters.track = selectedTrack;
      filters.showAll = showAll;
      filters.page = currentPage;
      filters.limit = pageSize;

      const response = await getRecommendedSessions(filters);
      // Handle both old format (array) and new format (object with data property)
      const responseData = response.data;
      const sessionsData = Array.isArray(responseData) ? responseData : (responseData?.data || []);
      const paginationData = responseData?.pagination || { total: sessionsData.length, totalPages: 1 };
      
      setPagination(paginationData);
      const processedSessions: Session[] = sessionsData.map((s: any) => ({
        ...s,
        time: s.startTime ? new Date(s.startTime).toLocaleTimeString() : undefined,
        room: s.room?.name || null,
        expectedAudience: s.event?.expectedAudience,
        capacity: s.capacity,
        isEventRegistered: s.isEventRegistered,
        eventRegistrationStatus: s.eventRegistrationStatus,
        eventId: s.eventId,
      }));
      setSessions(processedSessions);
    } catch (error: any) {
      toast.error('Failed to fetch sessions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchSessions();
  }, [showAll]);

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-[#28A9A1]';
    if (score >= 70) return 'bg-[#0F6AB4]';
    return 'bg-gray-400';
  };

  // Extract unique values for filter dropdowns from all sessions
  // Use predefined topics list to ensure consistency with session creation
  const uniqueDays = Array.from(new Set(
    allSessions
      .map(s => s.dayNumber || s.dayOfWeek)
      .filter(Boolean)
      .sort()
  ));
  const uniqueTracks = Array.from(new Set(allSessions.map(s => s.topic).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">Recommended Sessions for You</h1>
        <p className="text-gray-600">Personalized session recommendations based on your interests</p>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Button
          variant={showAll ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowAll(false)}
        >
          My Events' Sessions
        </Button>
        <Button
          variant={showAll ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowAll(true)}
        >
          Show All Sessions
        </Button>
        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {SESSION_TOPICS.map(topic => (
              <SelectItem key={topic} value={topic}>{topic}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedDay} onValueChange={setSelectedDay}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            {uniqueDays.map(day => (
              <SelectItem key={day} value={day}>{day}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedTrack} onValueChange={setSelectedTrack}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tracks</SelectItem>
            {uniqueTracks.map(track => (
              <SelectItem key={track} value={track}>{track}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-gray-600">Loading sessions...</div>
        </div>
      ) : sessions.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-gray-900 mb-2">No sessions available</h3>
            <p className="text-gray-600">
              {!showAll && sessions.length === 0
                ? 'Register for events to see their sessions'
                : sessions.length === 0 
                ? 'Sessions will appear here once events are created with sessions'
                : 'No sessions match your selected filter'}
            </p>
            {!showAll && sessions.length === 0 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => onNavigate?.('rsvp')}
              >
                Browse Events
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-gray-900 font-medium flex-1">{session.title}</h3>
                  <div className="flex gap-2">
                    {session.isEventRegistered && (
                      <Badge className={session.eventRegistrationStatus === 'CONFIRMED' ? 'bg-green-500 text-white text-xs' : 'bg-yellow-500 text-white text-xs'}>
                        {session.eventRegistrationStatus === 'CONFIRMED' ? 'Registered' : 'Waitlisted'}
                      </Badge>
                    )}
                    {!session.isEventRegistered && showAll && (
                      <Badge variant="outline" className="text-xs">
                        Not Registered
                      </Badge>
                    )}
                    {session.matchScore && (
                      <Badge className={`${getMatchColor(session.matchScore)} text-white text-xs`}>
                        {session.matchScore}% match
                      </Badge>
                    )}
                  </div>
                </div>
                {session.event && (
                  <div className="mb-2">
                    <Badge variant="outline" className="text-xs">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      Part of {session.event.title}
                    </Badge>
                  </div>
                )}
                {!session.isEventRegistered && showAll && (
                  <div className="mb-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate?.('rsvp')}
                      className="text-xs"
                    >
                      Register for Event <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                )}
                {session.speaker && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <User className="w-4 h-4" />
                    <span>{session.speaker}</span>
                  </div>
                )}
                <div className="space-y-2 text-sm text-gray-600">
                  {session.topic && (
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{session.topic}</Badge>
                    </div>
                  )}
                  <div className="flex items-center gap-4">
                    {session.time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{session.time}</span>
                      </div>
                    )}
                    {session.room && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{session.room}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    Duration: {session.durationMin || session.duration} min
                  </div>
                  {session.capacity !== undefined && session.event?.expectedAudience && (
                    <div className="text-xs text-gray-500">
                      Capacity: {Math.round((session.capacity / session.event.expectedAudience) * 100)}% ({session.capacity}/{session.event.expectedAudience})
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-gray-900">{session.title}</h3>
                      {session.isEventRegistered && (
                        <Badge className={session.eventRegistrationStatus === 'CONFIRMED' ? 'bg-green-500 text-white text-xs' : 'bg-yellow-500 text-white text-xs'}>
                          {session.eventRegistrationStatus === 'CONFIRMED' ? 'Registered' : 'Waitlisted'}
                        </Badge>
                      )}
                      {!session.isEventRegistered && showAll && (
                        <Badge variant="outline" className="text-xs">
                          Not Registered
                        </Badge>
                      )}
                      {session.topic && (
                        <Badge variant="outline" className="text-xs">{session.topic}</Badge>
                      )}
                      {session.matchScore && (
                        <Badge className={`${getMatchColor(session.matchScore)} text-white text-xs`}>
                          {session.matchScore}% match
                        </Badge>
                      )}
                    </div>
                    {session.event && (
                      <div className="mb-2">
                        <Badge variant="outline" className="text-xs">
                          <Calendar className="w-3 h-3 inline mr-1" />
                          Part of {session.event.title}
                        </Badge>
                      </div>
                    )}
                    {!session.isEventRegistered && showAll && (
                      <div className="mb-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onNavigate?.('rsvp')}
                          className="text-xs"
                        >
                          Register for Event <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </div>
                    )}
                    {session.speaker && (
                      <p className="text-sm text-gray-600 mb-2">{session.speaker}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {session.time && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.time}</span>
                        </div>
                      )}
                      {session.room && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          <span>{session.room}</span>
                        </div>
                      )}
                      <span>{session.durationMin || session.duration} min</span>
                    </div>
                    {session.capacity !== undefined && session.event?.expectedAudience && (
                      <div className="text-xs text-gray-500">
                        Capacity: {Math.round((session.capacity / session.event.expectedAudience) * 100)}% ({session.capacity}/{session.event.expectedAudience})
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Per page:</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(value: string) => {
                setPageSize(parseInt(value));
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-sm text-gray-600">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, pagination.total)} of {pagination.total} sessions
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <div className="text-sm text-gray-600">
              Page {currentPage} of {pagination.totalPages}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
              disabled={currentPage === pagination.totalPages}
            >
              Next
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
