import { Card, CardContent } from '../components/ui/card';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { TeamMember } from '../types';

export function TeamPage() {
  const teamMembers: TeamMember[] = [
    {
      id: '1',
      name: 'Weranga Dasanayake',
      index: '123456',
      role: 'Project Manager',
    },
    {
      id: '2',
      name: 'Dileeka Iranjan',
      index: '123457',
      role: 'Software Engineer',
    },
    {
      id: '3',
      name: 'Nilakni Gemini Perera',
      index: '123458',
      role: 'System Analyst',
    },
    {
      id: '4',
      name: 'Achini Anuththara',
      index: '123459',
      role: 'QA Engineer',
    },
    {
      id: '5',
      name: 'Waruni Samarathunga',
      index: '123460',
      role: 'UI Engineer',
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  };

  const getAvatarColor = (index: number) => {
    const colors = ['#0F6AB4', '#28A9A1', '#8B5CF6', '#F9B233', '#10B981'];
    return colors[index % colors.length];
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-gray-900 mb-2">Our Team</h1>
        <p className="text-gray-600">Meet the people behind EventAI Smart Event Planner</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teamMembers.map((member, index) => (
          <Card key={member.id} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-20 h-20 mb-4" style={{ backgroundColor: getAvatarColor(index) }}>
                  <AvatarFallback className="text-white text-xl">
                    {getInitials(member.name)}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-gray-900 mb-1">{member.name}</h3>
                <p className="text-sm text-gray-600 mb-2">{member.role}</p>
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">
                  Index: {member.index}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] text-white">
        <CardContent className="p-8 text-center">
          <h2 className="mb-2">AI-Driven Smart Event Planner</h2>
          <p className="text-white/90 mb-4">
            A comprehensive event management platform featuring AI-powered scheduling, budget tracking, and attendee management.
          </p>
          <div className="flex items-center justify-center gap-6 text-sm">
            <div>
              <p className="text-white/80">Project Type</p>
              <p>Web Dashboard</p>
            </div>
            <div className="w-px h-8 bg-white/30"></div>
            <div>
              <p className="text-white/80">Technologies</p>
              <p>React + NestJS</p>
            </div>
            <div className="w-px h-8 bg-white/30"></div>
            <div>
              <p className="text-white/80">Year</p>
              <p>2025</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
