import { useState, useEffect } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Clock, MapPin, User, Grid3x3, List, Sparkles } from 'lucide-react';
import { Session } from '../types';
import { getRecommendedSessions } from '../api';
import { toast } from 'sonner';

export function RecommendationsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedTrack, setSelectedTrack] = useState('all');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [allSessions, setAllSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAllSessions();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [selectedTopic, selectedDay, selectedTrack]);

  const fetchAllSessions = async () => {
    try {
      const { data } = await getRecommendedSessions();
      const processedSessions: Session[] = data.map((s: any) => ({
        ...s,
        time: s.startTime ? new Date(s.startTime).toLocaleTimeString() : undefined,
        room: s.room?.name || null,
        expectedAudience: s.event?.expectedAudience,
      }));
      setAllSessions(processedSessions);
    } catch (error: any) {
      console.error('Failed to fetch all sessions for filters', error);
    }
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const filters: { topic?: string; day?: string; track?: string } = {};
      if (selectedTopic !== 'all') filters.topic = selectedTopic;
      if (selectedDay !== 'all') filters.day = selectedDay;
      if (selectedTrack !== 'all') filters.track = selectedTrack;

      const { data } = await getRecommendedSessions(filters);
      const processedSessions: Session[] = data.map((s: any) => ({
        ...s,
        time: s.startTime ? new Date(s.startTime).toLocaleTimeString() : undefined,
        room: s.room?.name || null,
        expectedAudience: s.event?.expectedAudience,
      }));
      setSessions(processedSessions);
    } catch (error: any) {
      toast.error('Failed to fetch sessions');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-[#28A9A1]';
    if (score >= 70) return 'bg-[#0F6AB4]';
    return 'bg-gray-400';
  };

  // Extract unique values for filter dropdowns from all sessions
  const uniqueTopics = Array.from(new Set(allSessions.map(s => s.topic).filter(Boolean)));
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
        <Select value={selectedTopic} onValueChange={setSelectedTopic}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by topic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Topics</SelectItem>
            {uniqueTopics.map(topic => (
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
              {sessions.length === 0 
                ? 'Sessions will appear here once events are created with sessions'
                : 'No sessions match your selected filter'}
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-gray-900 font-medium flex-1">{session.title}</h3>
                  {session.matchScore && (
                    <Badge className={`${getMatchColor(session.matchScore)} text-white text-xs`}>
                      {session.matchScore}% match
                    </Badge>
                  )}
                </div>
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
                      {session.topic && (
                        <Badge variant="outline" className="text-xs">{session.topic}</Badge>
                      )}
                      {session.matchScore && (
                        <Badge className={`${getMatchColor(session.matchScore)} text-white text-xs`}>
                          {session.matchScore}% match
                        </Badge>
                      )}
                    </div>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
