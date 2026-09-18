import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const shiftId = url.searchParams.get('shiftId');

    if (!shiftId) {
      return NextResponse.json({ error: 'Missing shiftId' }, { status: 400 });
    }

    /* Fetch the shift */
    const shiftResult = await db.select().from(schema.shifts).where(eq(schema.shifts.id, shiftId)).limit(1);
    if (shiftResult.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    const shift = shiftResult[0];

    /* Get all staff certified for this shift's location and skill */
    const staff = await db
      .select({
        userId: schema.users.id,
        name: schema.users.name,
        email: schema.users.email,
        timezonePref: schema.users.timezonePref,
      })
      .from(schema.users)
      .innerJoin(schema.userLocations, eq(schema.users.id, schema.userLocations.userId))
      .innerJoin(schema.userSkills, eq(schema.users.id, schema.userSkills.userId))
      .where(
        and(
          eq(schema.userLocations.locationId, shift.locationId),
          eq(schema.userSkills.skillId, shift.requiredSkillId)
        )
      );

    /* Get hours this week for each staff member */
    const weekStart = new Date();
    const day = weekStart.getUTCDay();
    const diff = (day + 6) % 7;
    weekStart.setUTCDate(weekStart.getUTCDate() - diff);
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

    const assignments = await db
      .select({
        userId: schema.shiftAssignments.userId,
        startAt: schema.shifts.startAt,
        endAt: schema.shifts.endAt,
      })
      .from(schema.shiftAssignments)
      .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
      .where(
        and(
          eq(schema.shiftAssignments.status, 'confirmed'),
          gte(schema.shifts.startAt, weekStart),
          lte(schema.shifts.startAt, weekEnd)
        )
      );

    const hoursByStaff = new Map<string, number>();
    for (const a of assignments) {
      const key = a.userId;
      const hours = (a.endAt.getTime() - a.startAt.getTime()) / (60 * 60 * 1000);
      hoursByStaff.set(key, (hoursByStaff.get(key) || 0) + hours);
    }

    const staffWithHours = staff.map(s => ({
      id: s.userId,
      name: s.name,
      email: s.email,
      hoursThisWeek: Math.round((hoursByStaff.get(s.userId) || 0) * 10) / 10,
      warnings: [],
      isBlocked: false,
    }));

    return NextResponse.json({ staff: staffWithHours, shift });
  } catch (error) {
    console.error('Error fetching available staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}