'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { useSSE } from '@/hooks/useSSE';

export function OnDutyNow() {
  /* This component uses SSE to stay updated */
  useSSE();

  const activeStaff = [
    { name: 'John Doe', location: 'Downtown', skill: 'Bartender', clockedIn: '16:55' },
    { name: 'Maria Garcia', location: 'Marina', skill: 'Line Cook', clockedIn: '17:02' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          On-Duty Now
          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 animate-pulse border-emerald-200">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeStaff.map((staff) => (
          <div key={staff.name} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border">
            <div>
              <p className="font-medium text-sm">{staff.name}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {staff.location}</span>
                <span className="flex items-center text-emerald-600"><Clock className="h-3 w-3 mr-1" /> {staff.clockedIn}</span>
              </div>
            </div>
            <Badge>{staff.skill}</Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
