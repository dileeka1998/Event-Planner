import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Sparkles, Save, Download, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '../components/ui/alert';

export function SchedulerPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scheduleGenerated, setScheduleGenerated] = useState(false);

  const rooms = ['Room A', 'Room B'];
  const timeSlots = ['09:00', '10:00', '11:00', '13:00', '14:00', '15:00'];
  
  const [schedule, setSchedule] = useState<Record<string, Record<string, string>>>({});

  const handleGenerateSchedule = () => {
    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      const newSchedule: Record<string, Record<string, string>> = {};
      const sessions = [
        'AI in Modern Apps\nDr. Sarah Chen',
        'Web Development\nJohn Martinez',
        'Cloud Architecture\nEmily Watson',
        'Data Science\nMike Johnson',
        'Security Best Practices\nLisa Anderson',
        'UX Design Trends\nDavid Lee'
      ];
      
      let sessionIndex = 0;
      rooms.forEach(room => {
        newSchedule[room] = {};
        timeSlots.forEach((slot, index) => {
          if (sessionIndex < sessions.length && index < 5) {
            newSchedule[room][slot] = sessions[sessionIndex];
            sessionIndex++;
          }
        });
      });
      
      setSchedule(newSchedule);
      setIsGenerating(false);
      setScheduleGenerated(true);
    }, 2000);
  };

  const handleDragStart = (e: React.DragEvent, room: string, slot: string) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ room, slot }));
  };

  const handleDrop = (e: React.DragEvent, targetRoom: string, targetSlot: string) => {
    e.preventDefault();
    const data = JSON.parse(e.dataTransfer.getData('text/plain'));
    
    // Swap sessions
    const newSchedule = { ...schedule };
    const temp = newSchedule[targetRoom]?.[targetSlot] || '';
    if (!newSchedule[targetRoom]) newSchedule[targetRoom] = {};
    if (!newSchedule[data.room]) newSchedule[data.room] = {};
    
    newSchedule[targetRoom][targetSlot] = newSchedule[data.room][data.slot] || '';
    newSchedule[data.room][data.slot] = temp;
    
    setSchedule(newSchedule);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-gray-900 mb-2">AI Scheduler - Timetable</h1>
        <p className="text-gray-600">Generate and optimize event schedules automatically</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Constraints */}
        <Card>
          <CardHeader>
            <CardTitle>Event Details & Constraints</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Available Rooms</p>
              <div className="space-y-1">
                {rooms.map(room => (
                  <div key={room} className="px-3 py-2 bg-gray-50 rounded text-sm">
                    {room}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Time Slots</p>
              <div className="space-y-1">
                {timeSlots.map(slot => (
                  <div key={slot} className="px-3 py-2 bg-gray-50 rounded text-sm">
                    {slot}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Sessions to Schedule</p>
              <p className="text-gray-900">6 sessions</p>
            </div>

            <Button 
              onClick={handleGenerateSchedule}
              disabled={isGenerating}
              className="w-full bg-[#28A9A1] hover:bg-[#229187]"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Schedule (AI)
                </>
              )}
            </Button>

            {scheduleGenerated && (
              <Alert className="bg-green-50 border-green-200">
                <Sparkles className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Optimized schedule generated using OR-Tools algorithm!
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Right Panel - Timetable Grid */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Generated Timetable</CardTitle>
                {scheduleGenerated && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </Button>
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export .ics
                    </Button>
                    <Button size="sm" className="bg-[#0F6AB4] hover:bg-[#0D5A9A]">
                      <Save className="w-4 h-4 mr-2" />
                      Save Schedule
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!scheduleGenerated ? (
                <div className="text-center py-12 text-gray-500">
                  <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Click "Generate Schedule" to create an optimized timetable</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="inline-block min-w-full">
                    <div className="grid grid-cols-[100px_repeat(2,1fr)] gap-2">
                      <div className="p-3"></div>
                      {rooms.map(room => (
                        <div key={room} className="p-3 bg-[#0F6AB4] text-white rounded-t text-center">
                          {room}
                        </div>
                      ))}
                      
                      {timeSlots.map(slot => (
                        <React.Fragment key={slot}>
                          <div className="p-3 bg-gray-100 rounded flex items-center justify-center">
                            {slot}
                          </div>
                          {rooms.map(room => (
                            <div
                              key={`${room}-${slot}`}
                              className="p-3 bg-gray-50 rounded border-2 border-dashed border-gray-200 hover:border-[#28A9A1] transition-colors min-h-[80px]"
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => handleDrop(e, room, slot)}
                            >
                              {schedule[room]?.[slot] && (
                                <div
                                  draggable
                                  onDragStart={(e) => handleDragStart(e, room, slot)}
                                  className="bg-[#28A9A1] text-white p-2 rounded text-sm cursor-move hover:bg-[#229187] transition-colors h-full"
                                >
                                  {schedule[room][slot].split('\n').map((line, i) => (
                                    <div key={i} className={i === 1 ? 'text-xs opacity-90 mt-1' : ''}>
                                      {line}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-4">
                    💡 Tip: Drag and drop sessions to manually adjust the schedule
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
