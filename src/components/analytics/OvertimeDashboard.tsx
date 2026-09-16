'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';

export function OvertimeDashboard() {
  const staffStats = [
    { name: 'John Doe', scheduled: 38, max: 40, risk: 'high' },
    { name: 'Sarah Smith', scheduled: 41.5, max: 40, risk: 'critical' },
    { name: 'Maria Garcia', scheduled: 24, max: 40, risk: 'low' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Overtime Risk Assessment</CardTitle>
        <CardDescription>Projected weekly hours based on confirmed and published shifts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {staffStats.map((staff) => (
          <div key={staff.name} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
            <div className="flex justify-between items-center">
              <span className="font-medium text-sm">{staff.name}</span>
              <span className="text-sm font-semibold">{staff.scheduled}h / {staff.max}h</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${staff.risk === 'critical' ? 'bg-destructive' : staff.risk === 'high' ? 'bg-warning' : 'bg-success'}`}
                style={{ width: `${Math.min(100, (staff.scheduled / staff.max) * 100)}%` }}
              />
            </div>

            {staff.risk === 'critical' && (
              <div className="flex items-center text-xs text-destructive mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" /> Exceeds 40h overtime limit
              </div>
            )}
            {staff.risk === 'high' && (
              <div className="flex items-center text-xs text-warning mt-1">
                <AlertTriangle className="h-3 w-3 mr-1" /> Approaching overtime threshold
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
