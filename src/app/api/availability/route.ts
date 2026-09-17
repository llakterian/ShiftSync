import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/*
 * Availability for the logged-in staff persona:
 * POST -> save recurring weekly windows (replaces the user's current set)
 *      -> or add a one-off override (date + available/unavailable + optional hours)
 */
export async function GET() {
  try {
    const role = cookies().get('mock_role')?.value || 'staff';
    const email = role === 'admin' ? 'admin@coastaleats.com' : role === 'manager' ? 'east.manager@coastaleats.com' : 'john@coastaleats.com';
    const me = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (me.length === 0) {
      return NextResponse.json({ windows: [], overrides: [] });
    }
    const userId = me[0].id;

    const [windows, overrides] = await Promise.all([
      db.select().from(schema.availabilityWindows).where(eq(schema.availabilityWindows.userId, userId)),
      db.select().from(schema.availabilityOverrides).where(eq(schema.availabilityOverrides.userId, userId)),
    ]);

    return NextResponse.json({ windows, overrides });
  } catch (error) {
    console.error('Error fetching availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const role = cookies().get('mock_role')?.value || 'staff';
    const email = role === 'admin' ? 'admin@coastaleats.com' : role === 'manager' ? 'east.manager@coastaleats.com' : 'john@coastaleats.com';
    const me = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (me.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const userId = me[0].id;

    /* Mode A: save recurring weekly windows */
    if (body.windows) {
      const windows = body.windows as { dayOfWeek: number; startTime: string; endTime: string }[];
      /* Validate */
      for (const w of windows) {
        if (!Number.isInteger(w.dayOfWeek) || w.dayOfWeek < 0 || w.dayOfWeek > 6) {
          return NextResponse.json({ error: 'dayOfWeek must be 0 (Sunday) to 6 (Saturday)' }, { status: 400 });
        }
        if (!/^\d{2}:\d{2}(:\d{2})?$/.test(w.startTime) || !/^\d{2}:\d{2}(:\d{2})?$/.test(w.endTime)) {
          return NextResponse.json({ error: 'Times must be HH:mm' }, { status: 400 });
        }
      }
      /* Replace the current recurring set in one transaction */
      await db.transaction(async (tx) => {
        await tx.delete(schema.availabilityWindows).where(eq(schema.availabilityWindows.userId, userId));
        if (windows.length > 0) {
          await tx.insert(schema.availabilityWindows).values(
            windows.map((w) => ({
              userId,
              dayOfWeek: w.dayOfWeek,
              startTime: w.startTime.length === 5 ? `${w.startTime}:00` : w.startTime,
              endTime: w.endTime.length === 5 ? `${w.endTime}:00` : w.endTime,
              effectiveFrom: '2026-01-01',
            }))
          );
        }
      });

      /* Notify managers for this user's locations (spec §7) */
      const locRows = await db
        .select({ locationId: schema.userLocations.locationId })
        .from(schema.userLocations)
        .where(eq(schema.userLocations.userId, userId));
      if (locRows.length > 0) {
        const managerRows = await db
          .select({ userId: schema.userLocations.userId })
          .from(schema.userLocations)
          .innerJoin(schema.users, eq(schema.userLocations.userId, schema.users.id))
          .where(eq(schema.users.role, 'manager'));
        const targets = new Set(managerRows.map((m) => m.userId));
        if (targets.size > 0) {
          await db.insert(schema.notifications).values(
            Array.from(targets).map((mgrId) => ({
              userId: mgrId,
              type: 'availability_changed',
              title: 'Availability changed',
              body: `${me[0].name} updated their recurring availability.`,
              payload: { changedBy: userId },
            }))
          );
        }
      }

      return NextResponse.json({ success: true, saved: windows.length }, { status: 201 });
    }

    /* Mode B: add a one-off date override */
    if (body.date && typeof body.isAvailable === 'boolean') {
      const dateStr = body.date as string;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return NextResponse.json({ error: 'date must be YYYY-MM-DD' }, { status: 400 });
      }
      const startTime = (body.startTime as string | undefined)?.length === 5 ? `${body.startTime}:00` : (body.startTime as string | undefined);
      const endTime = (body.endTime as string | undefined)?.length === 5 ? `${body.endTime}:00` : (body.endTime as string | undefined);
      if (body.isAvailable && (!startTime || !endTime)) {
        return NextResponse.json({ error: 'Custom-hours overrides need startTime and endTime' }, { status: 400 });
      }

      const inserted = await db
        .insert(schema.availabilityOverrides)
        .values({ userId, date: dateStr, isAvailable: body.isAvailable, startTime: startTime ?? null, endTime: endTime ?? null })
        .returning();

      return NextResponse.json({ success: true, override: inserted[0] }, { status: 201 });
    }

    return NextResponse.json({ error: 'Send either {windows:[...]} or {date, isAvailable, startTime?, endTime?}' }, { status: 400 });
  } catch (error) {
    console.error('Error saving availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
