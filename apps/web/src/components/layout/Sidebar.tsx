import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Clock, 
  Lightbulb, 
  DollarSign, 
  CheckSquare, 
  Settings,
  MapPin,
  UserCheck,
  Building2
} from 'lucide-react';
import { cn } from '../ui/utils';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  userRole: 'Admin' | 'Organizer' | 'Attendee';
}

export function Sidebar({ currentPage, onNavigate, userRole }: SidebarProps) {
  const menuItems = [
    { id: 'admin', label: 'Admin Dashboard', icon: Settings, roles: ['Admin'] },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['Organizer', 'Attendee'] },
    { id: 'events', label: 'Events', icon: Calendar, roles: ['Admin', 'Organizer'] },
    { id: 'venues', label: 'Venues', icon: MapPin, roles: ['Admin', 'Organizer'] },
    { id: 'rooms', label: 'Rooms', icon: Building2, roles: ['Organizer'] },
    { id: 'speakers', label: 'Speakers & Sessions', icon: Users, roles: ['Organizer'] },
    { id: 'scheduler', label: 'AI Scheduler', icon: Clock, roles: ['Organizer'] },
    { id: 'budget', label: 'Budget Overview', icon: DollarSign, roles: ['Organizer'] },
    { id: 'attendees', label: 'Attendees', icon: UserCheck, roles: ['Admin', 'Organizer'] },
    { id: 'recommendations', label: 'Recommendations', icon: Lightbulb, roles: ['Attendee'] },
    { id: 'rsvp', label: 'My Events', icon: CheckSquare, roles: ['Attendee'] },
    { id: 'team', label: 'Team', icon: Users, roles: ['Admin', 'Organizer', 'Attendee'] },
  ];

  const filteredMenuItems = menuItems.filter(item => item.roles.includes(userRole));

  return (
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] rounded-lg flex items-center justify-center">
            <Calendar className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-[#0F6AB4]">EventAI</h1>
            <p className="text-xs text-gray-500">Smart Event Planner</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3">
        {filteredMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all",
                isActive 
                  ? "bg-[#0F6AB4] text-white shadow-md" 
                  : "text-gray-700 hover:bg-gray-100"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {userRole !== 'Attendee' && (
        <div className="p-4 border-t border-gray-200">
          <div className="bg-gradient-to-br from-[#0F6AB4] to-[#28A9A1] rounded-lg p-4 text-white">
            <p className="text-xs opacity-90 mb-1">Pro Tip</p>
            <p className="text-sm">Use AI Scheduler to automatically optimize your event timetable</p>
          </div>
        </div>
      )}
    </aside>
  );
}