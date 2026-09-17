import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { and, eq, gte, or } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/*
 * "My Schedule": upcoming shifts for the logged-in persona, in each
 * location's timezone, with assignment status.
 */
export async function GET() {
  try {
    const role = cookies().get('mock_role')?.value || 'staff';
    const email = role === 'admin'
      ? 'admin@coastaleats.com'
      : role === 'manager'
        ? 'east.manager@coastaleats.com'
        : 'john@coastaleats.com';

    const user = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (user.length === 0) {
      return NextResponse.json({ shifts: [] });
    }
    const userId = user[0].id;

    const now = new Date();
    const rows = await db
      .select({
        assignmentId: schema.shiftAssignments.id,
        assignmentStatus: schema.shiftAssignments.status,
        shiftId: schema.shifts.id,
        startAt: schema.shifts.startAt,
        endAt: schema.shifts.endAt,
        shiftStatus: schema.shifts.status,
        locationName: schema.locations.name,
        locationTz: schema.locations.timezone,
        skillName: schema.skills.name,
      })
      .from(schema.shiftAssignments)
      .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
      .innerJoin(schema.locations, eq(schema.shifts.locationId, schema.locations.id))
      .innerJoin(schema.skills, eq(schema.shifts.requiredSkillId, schema.skills.id))
      .where(
        and(
          eq(schema.shiftAssignments.userId, userId),
          or(
            eq(schema.shiftAssignments.status, 'assigned'),
            eq(schema.shiftAssignments.status, 'confirmed')
          ),
          gte(schema.shifts.endAt, now)
        )
      )
      .orderBy(schema.shifts.startAt);

    return NextResponse.json({ shifts: rows });
  } catch (error) {
    console.error('Error fetching my schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
