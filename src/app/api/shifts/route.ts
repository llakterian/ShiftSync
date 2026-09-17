import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { fromZonedTime } from 'date-fns-tz';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/*
 * Timezone-correct shift creation.
 * The client sends location-date + wall-clock times; we resolve them to
 * absolute UTC instants using the LOCATION's timezone (spec §8: users see
 * times in the location's timezone, overnight shifts stay one shift).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { locationId, requiredSkillId, date, startTime, endTime, headcountNeeded } = body;

    if (!locationId || !requiredSkillId || !date || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Missing required fields: locationId, requiredSkillId, date, startTime, endTime' },
        { status: 400 }
      );
    }

    const headcount = Number(headcountNeeded);
    if (!Number.isInteger(headcount) || headcount < 1 || headcount > 50) {
      return NextResponse.json({ error: 'headcountNeeded must be an integer between 1 and 50' }, { status: 400 });
    }

    /* Location determines the timezone for wall-clock -> instant conversion */
    const location = await db.select().from(schema.locations).where(eq(schema.locations.id, locationId)).limit(1);
    if (location.length === 0) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }
    const tz = location[0].timezone || 'UTC';

    /* Basic format validation before timezone math */
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime)) {
      return NextResponse.json({ error: 'Invalid date/time format' }, { status: 400 });
    }

    /* Overnight shift: end <= start means it ends the next calendar day (spec §8) */
    let startAt: Date;
    let endAt: Date;
    try {
      startAt = fromZonedTime(`${date}T${startTime}:00`, tz);
      let endDate = date;
      if (endTime <= startTime) {
        const d = new Date(`${date}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + 1);
        endDate = d.toISOString().slice(0, 10);
      }
      endAt = fromZonedTime(`${endDate}T${endTime}:00`, tz);
    } catch {
      return NextResponse.json({ error: 'Invalid date/time' }, { status: 400 });
    }

    if (endAt.getTime() <= startAt.getTime()) {
      return NextResponse.json({ error: 'Shift end must be after shift start' }, { status: 400 });
    }

    /* Actor for the audit trail */
    const actorId = await getActorId();

    const inserted = await db
      .insert(schema.shifts)
      .values({
        locationId,
        requiredSkillId,
        startAt,
        endAt,
        headcountNeeded: headcount,
        status: 'draft',
        createdBy: actorId,
      })
      .returning();

    /* Audit log — who/when/before/after (spec §9) */
    await db.insert(schema.auditLogs).values({
      entityType: 'shift',
      entityId: inserted[0].id,
      action: 'create',
      beforeState: null,
      afterState: { locationId, requiredSkillId, date, startTime, endTime, headcountNeeded: headcount, startAt: startAt.toISOString(), endAt: endAt.toISOString(), status: 'draft' },
      actorId,
    });

    /* Other tabs show fresh data on next navigation */
    revalidatePath('/manager/schedule');
    revalidatePath('/manager/analytics');
    revalidatePath('/staff/schedule');

    return NextResponse.json({ shift: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* GET: all shifts overlapping a week window (Mon 00:00 UTC to Sun 24:00 UTC), with assignment counts */
export async function GET(req: NextRequest) {
  try {
    const weekParam = req.nextUrl.searchParams.get('week'); // 'YYYY-MM-DD' = Monday
    let weekStart: Date;
    if (weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam)) {
      weekStart = new Date(`${weekParam}T00:00:00Z`);
    } else {
      const now = new Date();
      const day = now.getUTCDay();
      const diff = (day + 6) % 7; // Monday = 0
      weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - diff));
    }
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select({
        id: schema.shifts.id,
        locationId: schema.shifts.locationId,
        locationName: schema.locations.name,
        locationTz: schema.locations.timezone,
        requiredSkillId: schema.shifts.requiredSkillId,
        skillName: schema.skills.name,
        startAt: schema.shifts.startAt,
        endAt: schema.shifts.endAt,
        headcountNeeded: schema.shifts.headcountNeeded,
        status: schema.shifts.status,
        assignedCount: sql<number>`(
          select count(*) from ${schema.shiftAssignments}
          where ${schema.shiftAssignments.shiftId} = ${schema.shifts.id}
            and ${schema.shiftAssignments.status} in ('assigned','confirmed')
        )`,
      })
      .from(schema.shifts)
      .innerJoin(schema.locations, eq(schema.shifts.locationId, schema.locations.id))
      .innerJoin(schema.skills, eq(schema.shifts.requiredSkillId, schema.skills.id))
      .where(
        and(
          /* Overlap the week window so overnight shifts starting Sunday are included */
          lte(schema.shifts.startAt, weekEnd),
          gte(schema.shifts.endAt, weekStart)
        )
      )
      .orderBy(schema.shifts.startAt);

    return NextResponse.json({
      weekStart: weekStart.toISOString().slice(0, 10),
      shifts: rows,
    });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/* Resolve current session persona to a user id for audit; null = system */
async function getActorId(): Promise<string | null> {
  try {
    const role = cookies().get('mock_role')?.value || 'manager';
    const email = role === 'admin'
      ? 'admin@coastaleats.com'
      : role === 'staff'
        ? 'john@coastaleats.com'
        : 'east.manager@coastaleats.com';
    const u = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return u.length > 0 ? u[0].id : null;
  } catch {
    return null;
  }
}
