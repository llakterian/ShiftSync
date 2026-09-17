'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertTriangle } from 'lucide-react';
import { useSSE } from '@/hooks/useSSE';

type StaffHours = {
  userId: string;
  name: string;
  hours: number;
  shifts: number;
  premiumShifts: number;
  dailyMaxHours: number;
  fairnessScore: number;
};

export function OvertimeDashboard() {
  const [staff, setStaff] = useState<StaffHours[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setStaff(data.staff || []);
      }
    } catch {
      /* keep last known */
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useSSE((payload) => {
    if (['shifts', 'shift_assignments', 'swap_requests'].includes(payload.table)) fetchAnalytics();
  });

  const riskFor = (h: number): 'low' | 'high' | 'critical' => (h > 40 ? 'critical' : h >= 35 ? 'high' : 'low');

  if (!loaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overtime Risk Assessment</CardTitle>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground animate-pulse">Loading…</p></CardContent>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overtime Risk Assessment</CardTitle>
          <CardDescription>Projected weekly hours based on confirmed and published shifts.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No assignments this week.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Overtime Risk Assessment</CardTitle>
        <CardDescription>Projected weekly hours based on confirmed and published shifts.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {staff.map((s) => {
          const risk = riskFor(s.hours);
          return (
            <div key={s.userId} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
              <div className="flex justify-between items-center">
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-sm font-semibold">{s.hours}h / 40h</span>
              </div>

              <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full ${risk === 'critical' ? 'bg-destructive' : risk === 'high' ? 'bg-warning' : 'bg-success'}`}
                  style={{ width: `${Math.min(100, (s.hours / 40) * 100)}%` }}
                />
              </div>

              {risk === 'critical' && (
                <div className="flex items-center text-xs text-destructive mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Exceeds 40h overtime limit
                </div>
              )}
              {risk === 'high' && (
                <div className="flex items-center text-xs text-warning mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Approaching overtime threshold
                </div>
              )}
              {s.dailyMaxHours > 8 && (
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <AlertTriangle className="h-3 w-3 mr-1" /> Peak day: {s.dailyMaxHours}h
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
