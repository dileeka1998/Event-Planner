import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Plus, Sparkles, Download } from 'lucide-react';

interface QuickActionsProps {
  onCreateEvent: () => void;
  onRunScheduler: () => void;
  onExportTimetable: () => void;
}

export function QuickActions({ onCreateEvent, onRunScheduler, onExportTimetable }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <Button 
          onClick={onCreateEvent}
          className="w-full justify-start bg-[#0F6AB4] hover:bg-[#0D5A9A]"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create New Event
        </Button>
        <Button 
          onClick={onRunScheduler}
          className="w-full justify-start bg-[#28A9A1] hover:bg-[#229187]"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Run AI Scheduler
        </Button>
        <Button 
          onClick={onExportTimetable}
          variant="outline"
          className="w-full justify-start"
        >
          <Download className="w-4 h-4 mr-2" />
          Export Timetable
        </Button>
      </CardContent>
    </Card>
  );
}
