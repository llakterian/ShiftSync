'use client';

import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatInTimeZone } from 'date-fns-tz';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { useSSE } from '@/hooks/useSSE';
import { toast } from '@/components/ui/toast';

type DropShift = {
  requestId: string;
  assignmentId: string;
  expiresAt: string;
  droppedByName: string;
  startAt: string;
  endAt: string;
  locationName: string;
  locationTz: string;
  skillName: string;
};

type MyRequest = {
  requestId: string;
  type: string;
  status: string;
  requesterNote: string | null;
  startAt: string;
  endAt: string;
  locationName: string;
  locationTz: string;
  skillName: string;
  targetName: string | null;
};

const statusStyles: Record<string, string> = {
  pending: 'bg-warning/10 text-warning',
  approved: 'bg-success/10 text-success',
  accepted: 'bg-success/10 text-success',
  rejected: 'bg-destructive/10 text-destructive',
  cancelled: 'bg-muted text-muted-foreground',
  expired: 'bg-muted text-muted-foreground',
};

export function SwapsBoard() {
  const [available, setAvailable] = useState<DropShift[]>([]);
  const [mine, setMine] = useState<MyRequest[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const fetchSwaps = useCallback(async () => {
    try {
      const res = await fetch('/api/swaps');
      if (res.ok) {
        const data = await res.json();
        setAvailable(data.available || []);
        setMine(data.mine || []);
      }
    } catch {
      /* keep last known */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSwaps();
  }, [fetchSwaps]);

  /* Live: new drops and status changes appear without a refresh (spec §6) */
  useSSE(
    useCallback(
      (payload: { table: string }) => {
        if (['swap_requests', 'shift_assignments', 'shifts'].includes(payload.table)) fetchSwaps();
      },
      [fetchSwaps]
    )
  );

  const claim = async (requestId: string) => {
    setClaiming(requestId);
    try {
      const res = await fetch('/api/swaps/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Claim failed');
      toast.add({ type: 'success', title: 'Shift claimed', description: 'The shift has been added to your schedule.', timeout: 4000 });
      fetchSwaps();
    } catch (e) {
      toast.add({ type: 'error', title: 'Claim failed', description: e instanceof Error ? e.message : 'Unknown error', timeout: 4000 });
    } finally {
      setClaiming(null);
    }
  };

  const cancel = async (requestId: string) => {
    setCancelling(requestId);
    try {
      const res = await fetch('/api/swaps/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Cancel failed');
      toast.add({ type: 'success', title: 'Request cancelled', timeout: 4000 });
      fetchSwaps();
    } catch (e) {
      toast.add({ type: 'error', title: 'Cancel failed', description: e instanceof Error ? e.message : 'Unknown error', timeout: 4000 });
    } finally {
      setCancelling(null);
    }
  };

  if (!loaded) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Available to Pick Up</h3>
        {available.length === 0 ? (
          <p className="text-sm text-muted-foreground">No dropped shifts available to you right now.</p>
        ) : (
          available.map((d) => {
            const expiringSoon = new Date(d.expiresAt).getTime() - Date.now() < 12 * 60 * 60 * 1000;
            return (
              <Card key={d.requestId}>
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {formatInTimeZone(parseISO(d.startAt), d.locationTz, 'EEEE, MMM d')} ({formatInTimeZone(parseISO(d.startAt), d.locationTz, 'HH:mm')} - {formatInTimeZone(parseISO(d.endAt), d.locationTz, 'HH:mm')})
                    </p>
                    <p className="text-sm text-muted-foreground">{d.locationName} • <span className="capitalize">{d.skillName}</span></p>
                    <p className={`text-xs mt-1 ${expiringSoon ? 'text-destructive' : 'text-warning'}`}>
                      Dropped by: {d.droppedByName} • expires {formatDistanceToNow(new Date(d.expiresAt), { addSuffix: true })}
                    </p>
                  </div>
                  <Button onClick={() => claim(d.requestId)} disabled={claiming === d.requestId}>
                    {claiming === d.requestId ? 'Claiming…' : 'Claim Shift'}
                  </Button>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <div className="space-y-4 pt-6 border-t">
        <h3 className="text-lg font-semibold">My Requests</h3>
        {mine.length === 0 ? (
          <p className="text-sm text-muted-foreground">You have no swap or drop requests.</p>
        ) : (
          mine.map((m) => (
            <Card key={m.requestId}>
              <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusStyles[m.status] ?? 'bg-muted text-muted-foreground'}>
                      {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                    </Badge>
                    <span className="font-medium capitalize">{m.type} Request</span>
                  </div>
                  <p className="text-sm mt-2">
                    {m.type === 'swap' && m.targetName
                      ? `You requested to swap ${formatInTimeZone(parseISO(m.startAt), m.locationTz, 'MMM d HH:mm')} at ${m.locationName} with ${m.targetName}.`
                      : `You dropped ${formatInTimeZone(parseISO(m.startAt), m.locationTz, 'MMM d HH:mm')} at ${m.locationName}.`}
                  </p>
                  {m.requesterNote && <p className="text-xs text-muted-foreground mt-1">Note: {m.requesterNote}</p>}
                </div>
                {m.status === 'pending' && (
                  <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => cancel(m.requestId)} disabled={cancelling === m.requestId}>
                    {cancelling === m.requestId ? 'Cancelling…' : 'Cancel'}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
