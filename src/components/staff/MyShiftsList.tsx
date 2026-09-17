'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, MapPin } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { differenceInMinutes, parseISO } from 'date-fns';
import { useSSE } from '@/hooks/useSSE';

type MyShift = {
  assignmentId: string;
  assignmentStatus: string;
  shiftId: string;
  startAt: string;
  endAt: string;
  shiftStatus: string;
  locationName: string;
  locationTz: string;
  skillName: string;
};

export function MyShiftsList() {
  const [shifts, setShifts] = useState<MyShift[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchMyShifts = async () => {
    try {
      const res = await fetch('/api/my-shifts');
      if (res.ok) {
        const data = await res.json();
        setShifts(data.shifts || []);
      }
    } catch {
      /* keep last known */
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchMyShifts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Live: schedule changes appear without a refresh (spec §6) */
  useSSE((payload) => {
    if (['shifts', 'shift_assignments', 'swap_requests'].includes(payload.table)) fetchMyShifts();
  });

  if (!loaded) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>;
  }

  if (shifts.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming shifts. Your manager hasn&apos;t scheduled you yet.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {shifts.map((s) => {
        const hours = Math.round((differenceInMinutes(parseISO(s.endAt), parseISO(s.startAt)) / 60) * 10) / 10;
        const confirmed = s.assignmentStatus === 'confirmed';
        return (
          <Card key={s.assignmentId}>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex justify-between items-center">
                <span>{formatInTimeZone(parseISO(s.startAt), s.locationTz, 'EEEE, MMM d')}</span>
                <span
                  className={`text-xs px-2 py-1 rounded-full font-medium ${
                    confirmed
                      ? 'bg-success/10 text-success'
                      : s.shiftStatus === 'published'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {confirmed ? 'Confirmed' : s.shiftStatus === 'published' ? 'Published' : 'Draft'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground mt-2">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2" />
                  {formatInTimeZone(parseISO(s.startAt), s.locationTz, 'HH:mm')} - {formatInTimeZone(parseISO(s.endAt), s.locationTz, 'HH:mm')} ({hours}h)
                </div>
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-2" /> {s.locationName}
                </div>
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2 font-bold bg-muted flex items-center justify-center rounded-sm">
                    {s.skillName.charAt(0).toUpperCase()}
                  </span>
                  <span className="capitalize">{s.skillName}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
