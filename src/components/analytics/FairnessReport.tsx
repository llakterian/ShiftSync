'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

export function FairnessReport() {
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

  if (!loaded) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-lg">Schedule Fairness</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground animate-pulse">Loading…</p></CardContent>
      </Card>
    );
  }

  if (staff.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Schedule Fairness</CardTitle>
          <CardDescription>Distribution of premium shifts (Fri/Sat evening) this week.</CardDescription>
        </CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">No assignments this week.</p></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Schedule Fairness</CardTitle>
        <CardDescription>Distribution of premium shifts (Fri/Sat evening) this week.</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff Member</TableHead>
              <TableHead>Total Hours</TableHead>
              <TableHead>Premium Shifts</TableHead>
              <TableHead>Fairness Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.userId}>
                <TableCell className="font-medium">{s.name}</TableCell>
                <TableCell>{s.hours}h</TableCell>
                <TableCell>{s.premiumShifts}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`font-bold ${s.fairnessScore < 75 ? 'text-destructive' : 'text-success'}`}>
                      {s.fairnessScore}%
                    </span>
                    {s.fairnessScore < 75 && <span className="text-xs text-destructive">(Under-represented)</span>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
