import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/*
 * "On-Duty Now": staff currently clocked in (clockInAt set, clockOutAt null).
 */
export async function GET() {
  try {
    const rows = await db
      .select({
        userId: schema.users.id,
        name: schema.users.name,
        clockInAt: schema.shiftAssignments.clockInAt,
        locationName: schema.locations.name,
        locationTz: schema.locations.timezone,
        skillName: schema.skills.name,
      })
      .from(schema.shiftAssignments)
      .innerJoin(schema.users, eq(schema.shiftAssignments.userId, schema.users.id))
      .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
      .innerJoin(schema.locations, eq(schema.shifts.locationId, schema.locations.id))
      .innerJoin(schema.skills, eq(schema.shifts.requiredSkillId, schema.skills.id))
      .where(
        and(
          isNotNull(schema.shiftAssignments.clockInAt),
          isNull(schema.shiftAssignments.clockOutAt)
        )
      );

    return NextResponse.json({ onDuty: rows });
  } catch (error) {
    console.error('Error fetching on-duty staff:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
