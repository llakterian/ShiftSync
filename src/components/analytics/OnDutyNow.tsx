'use client';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, Clock } from 'lucide-react';
import { formatInTimeZone } from 'date-fns-tz';
import { parseISO } from 'date-fns';
import { useSSE } from '@/hooks/useSSE';

type OnDutyRow = {
  userId: string;
  name: string;
  clockInAt: string;
  locationName: string;
  locationTz: string;
  skillName: string;
};

export function OnDutyNow() {
  const [onDuty, setOnDuty] = useState<OnDutyRow[]>([]);
  const [loaded, setLoaded] = useState(false);

  const fetchOnDuty = async () => {
    try {
      const res = await fetch('/api/on-duty');
      if (res.ok) {
        const data = await res.json();
        setOnDuty(data.onDuty || []);
      }
    } catch {
      /* keep last known data */
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    fetchOnDuty();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Live: clock-in/out writes to shift_assignments -> SSE -> refetch */
  useSSE(
    (payload) => {
      if (payload.table === 'shift_assignments') fetchOnDuty();
    }
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          On-Duty Now
          <Badge variant="outline" className="bg-success/10 text-success animate-pulse border-success/30">
            Live
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!loaded ? (
          <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
        ) : onDuty.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody is currently clocked in.</p>
        ) : (
          onDuty.map((staff) => (
            <div key={staff.userId} className="flex justify-between items-center p-3 bg-muted rounded-lg border">
              <div>
                <p className="font-medium text-sm">{staff.name}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center"><MapPin className="h-3 w-3 mr-1" /> {staff.locationName}</span>
                  <span className="flex items-center text-success">
                    <Clock className="h-3 w-3 mr-1" /> {formatInTimeZone(parseISO(staff.clockInAt), staff.locationTz, 'HH:mm')}
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="capitalize">{staff.skillName}</Badge>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
