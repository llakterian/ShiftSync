import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { and, eq, gte, lte, or } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/*
 * Weekly hours + fairness analytics for the current week (Mon-Sun UTC).
 * Counts assigned+confirmed assignments only; premium = Fri/Sat evening
 * (shift starting >= 16:00 local on Friday or Saturday).
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const weekParam = url.searchParams.get('week');
    let weekStart: Date;
    if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
      weekStart = new Date(`${weekParam}T00:00:00Z`);
    } else {
      const now = new Date();
      const day = now.getUTCDay();
      const diff = (day + 6) % 7;
      weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
    }
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        userId: schema.users.id,
        name: schema.users.name,
        startAt: schema.shifts.startAt,
        endAt: schema.shifts.endAt,
        status: schema.shifts.status,
      })
      .from(schema.shiftAssignments)
      .innerJoin(schema.users, eq(schema.shiftAssignments.userId, schema.users.id))
      .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
      .where(
        and(
          or(
            eq(schema.shiftAssignments.status, 'assigned'),
            eq(schema.shiftAssignments.status, 'confirmed')
          ),
          gte(schema.shifts.startAt, weekStart),
          lte(schema.shifts.startAt, weekEnd)
        )
      );

    /* Aggregate per staff */
    const byUser = new Map<string, { name: string; minutes: number; shifts: number; premiumShifts: number; dailyMinutes: Map<string, number> }>();
    for (const r of rows) {
      if (!byUser.has(r.userId)) {
        byUser.set(r.userId, { name: r.name, minutes: 0, shifts: 0, premiumShifts: 0, dailyMinutes: new Map() });
      }
      const u = byUser.get(r.userId)!;
      const mins = Math.max(0, (r.endAt.getTime() - r.startAt.getTime()) / 60000);
      u.minutes += mins;
      u.shifts += 1;
      const dayKey = r.startAt.toISOString().slice(0, 10);
      u.dailyMinutes.set(dayKey, (u.dailyMinutes.get(dayKey) || 0) + mins);

      /* Premium: Friday or Saturday, starting 16:00+ local OR spanning evening */
      const jsDay = r.startAt.getUTCDay(); // 5=Fri, 6=Sat
      const hour = r.startAt.getUTCHours();
      if ((jsDay === 5 || jsDay === 6) && hour >= 16) {
        u.premiumShifts += 1;
      }
    }

    const staff = Array.from(byUser.entries()).map(([userId, u]) => {
      const hours = u.minutes / 60;
      return {
        userId,
        name: u.name,
        hours: Math.round(hours * 10) / 10,
        shifts: u.shifts,
        premiumShifts: u.premiumShifts,
        dailyMaxHours: Math.round((Math.max(...Array.from(u.dailyMinutes.values(), (m) => m / 60), 0)) * 10) / 10,
      };
    });

    /* Fairness score: equity of premium shift distribution among staff with any shifts
       (1 - Gini-style spread, floor at 0) */
    const premiumTotal = staff.reduce((acc, s) => acc + s.premiumShifts, 0);
    const fairness = staff.map((s) => {
      if (premiumTotal === 0 || staff.length <= 1) return { ...s, fairnessScore: 100 };
      const expected = premiumTotal / staff.length;
      const deviation = Math.abs(s.premiumShifts - expected) / expected;
      return { ...s, fairnessScore: Math.max(0, Math.round(100 * (1 - deviation))) };
    });

    return NextResponse.json({ weekStart: weekStart.toISOString().slice(0, 10), staff: fairness });
  } catch (error) {
    console.error('Error computing analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
