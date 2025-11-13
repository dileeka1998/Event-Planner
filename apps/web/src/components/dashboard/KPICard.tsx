import { Card, CardContent } from '../ui/card';
import { Progress } from '../ui/progress';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  trend?: string;
  showProgress?: boolean;
  progressValue?: number;
}

export function KPICard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  trend,
  showProgress = false,
  progressValue = 0
}: KPICardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-gray-600 mb-1">{title}</p>
            <h2 className="text-gray-900">{value}</h2>
          </div>
          <div 
            className="w-12 h-12 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}15` }}
          >
            <Icon className="w-6 h-6" style={{ color }} />
          </div>
        </div>
        {showProgress && (
          <div className="mt-3">
            <Progress value={progressValue} className="h-2" />
          </div>
        )}
        {trend && (
          <p className="text-xs text-gray-500 mt-2">{trend}</p>
        )}
      </CardContent>
    </Card>
  );
}
