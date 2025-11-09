import { useState } from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Clock, MapPin, User, Grid3x3, List, Plus } from 'lucide-react';
import { Session } from '../types';

export function RecommendationsPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedTopic, setSelectedTopic] = useState('all');

  const recommendedSessions: (Session & { matchScore: number })[] = [
    {
      id: '1',
      title: 'AI in Modern Applications',
      speaker: 'Dr. Sarah Chen',
      track: 'Technology',
      duration: 60,
      expectedAudience: 150,
      time: '09:00 AM',
      room: 'Room A',
      matchScore: 95
    },
    {
      id: '2',
      title: 'Future of Web Development',
      speaker: 'John Martinez',
      track: 'Development',
      duration: 45,
      expectedAudience: 120,
      time: '10:30 AM',
      room: 'Room B',
      matchScore: 88
    },
    {
      id: '3',
      title: 'Cloud Architecture Patterns',
      speaker: 'Emily Watson',
      track: 'Technology',
      duration: 90,
      expectedAudience: 80,
      time: '01:00 PM',
      room: 'Room A',
      matchScore: 82
    },
    {
      id: '4',
      title: 'Data Science Workshop',
      speaker: 'Mike Johnson',
      track: 'Data',
      duration: 120,
      expectedAudience: 60,
      time: '02:00 PM',
      room: 'Room C',
      matchScore: 78
    },
    {
      id: '5',
      title: 'Security Best Practices',
      speaker: 'Lisa Anderson',
      track: 'Security',
      duration: 60,
      expectedAudience: 100,
      time: '03:30 PM',
      room: 'Room B',
      matchScore: 75
    },
    {
      id: '6',
      title: 'UX Design Trends 2025',
      speaker: 'David Lee',
      track: 'Design',
      duration: 45,
      expectedAudience: 90,
      time: '11:00 AM',
      room: 'Room A',
      matchScore: 72
    },
  ];

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-[#28A9A1]';
    if (score >= 70) return 'bg-[#0F6AB4]';
    return 'bg-gray-400';
  };

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
            <SelectItem value="technology">Technology</SelectItem>
            <SelectItem value="development">Development</SelectItem>
            <SelectItem value="design">Design</SelectItem>
            <SelectItem value="data">Data</SelectItem>
            <SelectItem value="security">Security</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by day" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Days</SelectItem>
            <SelectItem value="day1">Day 1</SelectItem>
            <SelectItem value="day2">Day 2</SelectItem>
          </SelectContent>
        </Select>

        <Select defaultValue="all">
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by track" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tracks</SelectItem>
            <SelectItem value="track1">Track 1</SelectItem>
            <SelectItem value="track2">Track 2</SelectItem>
          </SelectContent>
        </Select>

        <div className="ml-auto flex gap-2">
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

      {/* Session Cards */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <Badge className="bg-[#0F6AB4]/10 text-[#0F6AB4]">
                    {session.track}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <div 
                      className={`w-2 h-2 rounded-full ${getMatchColor(session.matchScore)}`}
                    />
                    <span className="text-sm">{session.matchScore}%</span>
                  </div>
                </div>

                <h3 className="text-gray-900 mb-2">{session.title}</h3>
                
                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    <span>{session.speaker}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>{session.time} • {session.duration} min</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{session.room}</span>
                  </div>
                </div>

                <Button className="w-full bg-[#28A9A1] hover:bg-[#229187]">
                  <Plus className="w-4 h-4 mr-2" />
                  Add to My Schedule
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {recommendedSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-gray-900">{session.title}</h3>
                      <Badge className="bg-[#0F6AB4]/10 text-[#0F6AB4]">
                        {session.track}
                      </Badge>
                      <div className="flex items-center gap-2 ml-auto">
                        <div 
                          className={`w-2 h-2 rounded-full ${getMatchColor(session.matchScore)}`}
                        />
                        <span className="text-sm">{session.matchScore}% match</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{session.speaker}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>{session.time} • {session.duration} min</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        <span>{session.room}</span>
                      </div>
                    </div>
                  </div>
                  <Button className="bg-[#28A9A1] hover:bg-[#229187]">
                    <Plus className="w-4 h-4 mr-2" />
                    Add to Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
