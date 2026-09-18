'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CheckCircle, AlertCircle, Clock, MapPin, User } from 'lucide-react';
import { toast } from '@/components/ui/toast';

interface StaffMember {
  id: string;
  name: string;
  email: string;
  hoursThisWeek: number;
  warnings: string[];
  isBlocked: boolean;
}

interface ShiftData {
  id: string;
  locationName: string;
  locationTz: string;
  skillName: string;
  startAt: string;
  endAt: string;
  headcountNeeded: number;
  assignedCount: number;
}

interface AssignmentModalProps {
  shift: {
    id: string;
    locationName: string;
    locationTz: string;
    skillName: string;
    startAt: string;
    endAt: string;
    headcountNeeded: number;
    assignedCount: number;
  } | null;
  onClose: () => void;
  onAssigned: () => void;
}

function formatTime(dateStr: string, tz: string) {
  return new Date(dateStr).toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function formatDate(dateStr: string, tz: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    timeZone: tz,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getSeverityIcon(severity: string) {
  switch (severity) {
    case 'block': return <AlertCircle className="h-4 w-4 text-destructive" />;
    case 'warn': return <AlertCircle className="h-4 w-4 text-warning" />;
    case 'override': return <AlertCircle className="h-4 w-4 text-primary" />;
    default: return <CheckCircle className="h-4 w-4 text-success" />;
  }
}

export function AssignmentModal({ shift, onClose, onAssigned }: AssignmentModalProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState<string | null>(null);
  const [checkResults, setCheckResults] = useState<Record<string, { ok: boolean; severity: string; message: string }[]>>({});

  useEffect(() => {
    if (!shift) return;
    fetchStaff();
  }, [shift]);

  const fetchStaff = async () => {
    if (!shift) return;
    setLoading(true);
    try {
      const res = await fetch(`api/assignments?shiftId=${shift.id}`);
      if (!res.ok) throw new Error('Failed to load staff');
      const data = await res.json();
      setStaff(data.staff || []);
    } catch (e) {
      toast.add({ type: 'error', title: 'Error', description: 'Failed to load staff' });
    } finally {
      setLoading(false);
    }
  };

  const runCheck = async (userId: string) => {
    if (!shift) return;
    setChecking(userId);
    try {
      const res = await fetch('/api/assignments/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, shiftId: shift.id }),
      });
      const data = await res.json();
      setCheckResults(prev => ({ ...prev, [userId]: data.results || [] }));
    } catch (e) {
      toast.add({ type: 'error', title: 'Error', description: 'Check failed' });
    } finally {
      setChecking(null);
    }
  };

  const confirmAssign = async (userId: string) => {
    if (!shift) return;
    try {
      const res = await fetch('/api/assignments/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, shiftId: shift.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Assignment failed');
      toast.add({ type: 'success', title: 'Assigned', description: 'Staff member assigned to shift' });
      onAssigned();
      onClose();
    } catch (e) {
      toast.add({ type: 'error', title: 'Assignment failed', description: e instanceof Error ? e.message : 'Unknown error' });
    }
  };

  if (!shift) return null;

  return (
    <Dialog open={!!shift} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="text-lg">Assign Staff to Shift</DialogTitle>
        </DialogHeader>
        <div className="p-0">
          <div className="p-4 border-b bg-muted/50">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">{shift.locationName}</p>
                <p className="text-muted-foreground capitalize">{shift.skillName}</p>
              </div>
              <div className="text-right">
                <p className="font-medium">{formatDate(shift.startAt, shift.locationTz)}</p>
                <p className="text-muted-foreground">
                  {formatTime(shift.startAt, shift.locationTz)} – {formatTime(shift.endAt, shift.locationTz)}
                </p>
              </div>
              <div className="col-span-2 flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" /> {shift.locationName}
                <span className="mx-1">|</span>
                <Clock className="h-4 w-4" /> {shift.assignedCount}/{shift.headcountNeeded} filled
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-4 text-center text-muted-foreground animate-pulse">Loading staff…</div>
          ) : staff.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">No qualified staff found for this shift.</div>
          ) : (
            <ScrollArea className="h-[400px] p-4">
              <div className="space-y-3">
                {staff.map((s) => {
                  const results = checkResults[s.id] || [];
                  const isBlocked = results.some(r => !r.ok && r.severity === 'block');
                  const isOverride = results.some(r => !r.ok && r.severity === 'override');
                  const hasWarnings = results.some(r => !r.ok && r.severity === 'warn');
                  const checked = results.length > 0;

                  return (
                    <div
                      key={s.id}
                      className={`p-3 rounded-lg border transition-colors ${
                        isBlocked ? 'bg-destructive/5 border-destructive/20' :
                        isOverride ? 'bg-primary/5 border-primary/20' :
                        hasWarnings ? 'bg-warning/5 border-warning/20' :
                        checked ? 'bg-success/5 border-success/20' : 'bg-card'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium truncate">{s.name}</span>
                            <span className="text-xs text-muted-foreground">{s.email}</span>
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1"><User className="h-3 w-3" /> {s.hoursThisWeek}h this week</span>
                          </div>
                          {checked && (
                            <div className="mt-2 space-y-1">
                              {results.map((r, i) => (
                                <div key={i} className="flex items-center gap-1.5 text-xs">
                                  {getSeverityIcon(r.severity)}
                                  <span className={
                                    r.severity === 'block' ? 'text-destructive' :
                                    r.severity === 'warn' ? 'text-warning' :
                                    r.severity === 'override' ? 'text-primary' :
                                    'text-success'
                                  }>
                                    {r.message}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {checked && isBlocked ? (
                            <Button variant="outline" disabled className="text-destructive">
                              Blocked
                            </Button>
                          ) : checked && isOverride ? (
                            <Button variant="default" onClick={() => confirmAssign(s.id)} className="text-xs">
                              Override & Assign
                            </Button>
                          ) : checked && hasWarnings ? (
                            <Button variant="default" onClick={() => confirmAssign(s.id)} className="text-xs">
                              Assign (warn)
                            </Button>
                          ) : checked ? (
                            <Button variant="default" onClick={() => confirmAssign(s.id)} className="text-xs">
                              Assign
                            </Button>
                          ) : (
                            <Button variant="outline" size="sm" onClick={() => runCheck(s.id)} disabled={checking === s.id}>
                              {checking === s.id ? 'Checking…' : 'Check'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="border-t p-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}