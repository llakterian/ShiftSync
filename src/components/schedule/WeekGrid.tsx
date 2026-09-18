'use client';

import { useCallback, useEffect, useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { Badge } from "@/components/ui/badge";
import { AssignmentModal } from "./AssignmentModal";

type Shift = {
  id: string;
  locationId: string;
  locationName: string;
  locationTz: string;
  requiredSkillId: string;
  skillName: string;
  startAt: string;
  endAt: string;
  headcountNeeded: number;
  status: string;
  assignedCount: number;
};

export function WeekGrid() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getUTCDay();
    const diff = (day + 6) % 7;
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
  });
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);

  const weekKey = format(weekStart, "yyyy-MM-dd");

  const fetchShifts = useCallback(async () => {
    try {
      const res = await fetch(`/api/shifts?week=${weekKey}`);
      if (!res.ok) throw new Error("Failed to load shifts");
      const data = await res.json();
      setShifts(data.shifts || []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  }, [weekKey]);

  useEffect(() => {
    setLoading(true);
    fetchShifts();
  }, [fetchShifts]);

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift);
  };

  const handleAssignmentComplete = () => {
    setSelectedShift(null);
  };

  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));
  const today = format(new Date(), "yyyy-MM-dd");

  const shiftsByDay = new Map<string, Shift[]>();
  shifts.forEach((s) => {
    const key = formatInTimeZone(parseISO(s.startAt), s.locationTz, "yyyy-MM-dd");
    if (!shiftsByDay.has(key)) shiftsByDay.set(key, []);
    shiftsByDay.get(key)!.push(s);
  });

  const goPrevWeek = () => setWeekStart(addDays(weekStart, -7));
  const goNextWeek = () => setWeekStart(addDays(weekStart, 7));
  const goThisWeek = () => setWeekStart(new Date());

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={goPrevWeek} className="h-8 px-3 text-sm rounded-md border bg-background hover:bg-accent" aria-label="Previous week">&larr;</button>
          <button onClick={goThisWeek} className="h-8 px-3 text-sm rounded-md border bg-background hover:bg-accent">Today</button>
          <button onClick={goNextWeek} className="h-8 px-3 text-sm rounded-md border bg-background hover:bg-accent" aria-label="Next week">&rarr;</button>
        </div>
        <div className="text-sm font-medium text-foreground">Week of {format(weekStart, "MMM d")} – {format(addDays(weekStart, 6), "MMM d, yyyy")}</div>
      </div>

      <div className="grid grid-cols-7 border-b bg-muted/50 flex-shrink-0">
        {weekDays.map((day, i) => {
          const isToday = format(day, "yyyy-MM-dd") === today;
          return (
            <div key={i} className={`py-3 px-4 border-r last:border-r-0 text-center ${isToday ? "bg-accent/60" : ""}`}>
              <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">{format(day, "EEE")}</div>
              <div className={`text-lg font-medium mt-1 ${isToday ? "text-primary" : "text-foreground"}`}>{format(day, "d")}</div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {weekDays.map((day, i) => {
          const key = format(day, "yyyy-MM-dd");
          const dayShifts = shiftsByDay.get(key) || [];
          return (
            <div key={i} className="border-r last:border-r-0 p-2 bg-background min-h-[200px] align-top">
              {loading && dayShifts.length === 0 ? (
                <div className="text-xs text-muted-foreground text-center mt-4 animate-pulse">Loading\u2026</div>
              ) : dayShifts.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center mt-4">\u2014</div>
              ) : (
                <div className="space-y-2">
                  {dayShifts.map((s) => (
                    <div key={s.id} className="rounded-md border bg-card p-2 text-xs shadow-sm cursor-pointer hover:bg-accent/50 transition-colors" title={`${s.locationName} \u00b7 ${s.skillName}`} onClick={() => setSelectedShift(s)}>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-foreground truncate">{formatInTimeZone(parseISO(s.startAt), s.locationTz, "HH:mm")} - {formatInTimeZone(parseISO(s.endAt), s.locationTz, "HH:mm")}</span>
                        <Badge variant={s.status === "published" ? "default" : "secondary"} className="text-[10px] px-1.5 py-0">{s.status}</Badge>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-1">
                        <span className="text-muted-foreground truncate">{s.locationName}</span>
                        <span className={`font-medium ${s.assignedCount < s.headcountNeeded ? "text-warning" : "text-success"}`} title={`${s.assignedCount} assigned / ${s.headcountNeeded} needed`}>{s.assignedCount}/{s.headcountNeeded}</span>
                      </div>
                      <div className="mt-1 text-muted-foreground capitalize truncate">{s.skillName}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {error && <div className="border-t px-4 py-2 text-xs text-destructive flex-shrink-0" role="alert">{error} \u2014 showing last known data</div>}

      <AssignmentModal shift={selectedShift} onClose={() => setSelectedShift(null)} onAssigned={() => setSelectedShift(null)} />
    </div>
  );
}