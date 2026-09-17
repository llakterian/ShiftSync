'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';

type Override = { id: string; date: string; isAvailable: boolean; startTime: string | null; endTime: string | null };

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function AvailabilityManager() {
  const [windows, setWindows] = useState<Record<number, { start: string; end: string; enabled: boolean }>>({});
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ovDate, setOvDate] = useState('');
  const [ovType, setOvType] = useState<'off' | 'custom'>('off');
  const [ovStart, setOvStart] = useState('09:00');
  const [ovEnd, setOvEnd] = useState('17:00');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/availability');
        if (res.ok) {
          const data = await res.json();
          const w: Record<number, { start: string; end: string; enabled: boolean }> = {};
          for (const win of data.windows || []) {
            w[win.dayOfWeek] = {
              start: win.startTime.slice(0, 5),
              end: win.endTime.slice(0, 5),
              enabled: true,
            };
          }
          setWindows(w);
          setOverrides(data.overrides || []);
        }
      } catch {
        /* defaults */
      } finally {
        setLoaded(true);
      }
    })();
  }, []);

  const saveRecurring = async () => {
    setSaving(true);
    try {
      const payload = Object.entries(windows)
        .filter(([, v]) => v.enabled)
        .map(([day, v]) => ({ dayOfWeek: Number(day), startTime: v.start, endTime: v.end }));
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ windows: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      toast.add({ type: 'success', title: 'Availability saved', description: `${payload.length} day${payload.length === 1 ? '' : 's'} updated.`, timeout: 4000 });
    } catch (e) {
      toast.add({ type: 'error', title: 'Save failed', description: e instanceof Error ? e.message : 'Unknown error', timeout: 4000 });
    } finally {
      setSaving(false);
    }
  };

  const addOverride = async () => {
    if (!ovDate) {
      toast.add({ type: 'error', title: 'Pick a date first', timeout: 3000 });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          ovType === 'off'
            ? { date: ovDate, isAvailable: false }
            : { date: ovDate, isAvailable: true, startTime: ovStart, endTime: ovEnd }
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Add failed');
      toast.add({ type: 'success', title: 'Override added', description: ovDate, timeout: 4000 });
      setOverrides((prev) => [...prev, data.override]);
      setOvDate('');
    } catch (e) {
      toast.add({ type: 'error', title: 'Add failed', description: e instanceof Error ? e.message : 'Unknown error', timeout: 4000 });
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Recurring Weekly Hours</CardTitle>
          <CardDescription>Set the hours you are generally available each week.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {DAYS.map((day, i) => {
            const w = windows[i] ?? { start: '09:00', end: '17:00', enabled: false };
            return (
              <div key={day} className="flex items-center justify-between gap-2 border-b pb-2 last:border-0 last:pb-0">
                <label className="flex items-center gap-2 text-sm font-medium w-32 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={w.enabled}
                    onChange={(e) => setWindows({ ...windows, [i]: { ...w, enabled: e.target.checked } })}
                    className="h-4 w-4"
                  />
                  {day}
                </label>
                <div className="flex items-center space-x-2">
                  <Input
                    type="time"
                    className="w-28 text-sm"
                    value={w.start}
                    disabled={!w.enabled}
                    onChange={(e) => setWindows({ ...windows, [i]: { ...w, start: e.target.value } })}
                  />
                  <span>-</span>
                  <Input
                    type="time"
                    className="w-28 text-sm"
                    value={w.end}
                    disabled={!w.enabled}
                    onChange={(e) => setWindows({ ...windows, [i]: { ...w, end: e.target.value } })}
                  />
                </div>
              </div>
            );
          })}
          <Button className="w-full mt-4" onClick={saveRecurring} disabled={saving}>
            {saving ? 'Saving…' : 'Save Recurring'}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Date Overrides</CardTitle>
            <CardDescription>Request specific dates off or add extra availability.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="ov-date">Date</Label>
              <Input id="ov-date" type="date" value={ovDate} onChange={(e) => setOvDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ov-type">Status</Label>
              <select
                id="ov-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={ovType}
                onChange={(e) => setOvType(e.target.value as 'off' | 'custom')}
              >
                <option value="off">Unavailable (Time Off)</option>
                <option value="custom">Available (Custom Hours)</option>
              </select>
            </div>
            {ovType === 'custom' && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" className="text-sm" value={ovStart} onChange={(e) => setOvStart(e.target.value)} />
                <Input type="time" className="text-sm" value={ovEnd} onChange={(e) => setOvEnd(e.target.value)} />
              </div>
            )}
            <Button className="w-full" onClick={addOverride} disabled={saving}>
              {saving ? 'Adding…' : 'Add Override'}
            </Button>
          </CardContent>
        </Card>

        {overrides.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Overrides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {overrides.map((o) => (
                <div key={o.id} className="flex items-center justify-between text-sm border-b pb-2 last:border-0 last:pb-0">
                  <span className="font-medium">{o.date}</span>
                  <span className={o.isAvailable ? 'text-success' : 'text-destructive'}>
                    {o.isAvailable ? `Available ${o.startTime?.slice(0, 5)}-${o.endTime?.slice(0, 5)}` : 'Time off'}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
