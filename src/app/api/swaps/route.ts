import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { and, eq, gt, ne } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/*
 * Swaps & coverage data for the logged-in staff persona:
 * - available: dropped shifts (drop requests) still open for pickup, that the
 *   current user is qualified for (certification + skill)
 * - mine: the user's own swap/drop requests with status
 */
export async function GET() {
  try {
    const role = cookies().get('mock_role')?.value || 'staff';
    const email = role === 'admin' ? 'admin@coastaleats.com' : role === 'manager' ? 'east.manager@coastaleats.com' : 'john@coastaleats.com';
    const me = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (me.length === 0) {
      return NextResponse.json({ available: [], mine: [] });
    }
    const userId = me[0].id;
    const now = new Date();

    /* Dropped shifts: assignments with an open drop request, not mine, not expired */
    const openDrops = await db
      .select({
        requestId: schema.swapRequests.id,
        assignmentId: schema.swapRequests.assignmentId,
        expiresAt: schema.swapRequests.expiresAt,
        droppedByName: schema.users.name,
        shiftId: schema.shifts.id,
        startAt: schema.shifts.startAt,
        endAt: schema.shifts.endAt,
        locationName: schema.locations.name,
        locationId: schema.locations.id,
        locationTz: schema.locations.timezone,
        skillName: schema.skills.name,
        skillId: schema.skills.id,
      })
      .from(schema.swapRequests)
      .innerJoin(schema.shiftAssignments, eq(schema.swapRequests.assignmentId, schema.shiftAssignments.id))
      .innerJoin(schema.users, eq(schema.shiftAssignments.userId, schema.users.id))
      .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
      .innerJoin(schema.locations, eq(schema.shifts.locationId, schema.locations.id))
      .innerJoin(schema.skills, eq(schema.shifts.requiredSkillId, schema.skills.id))
      .where(
        and(
          eq(schema.swapRequests.type, 'drop'),
          eq(schema.swapRequests.status, 'pending'),
          ne(schema.shiftAssignments.userId, userId),
          gt(schema.swapRequests.expiresAt, now)
        )
      );

    /* Qualification filter: certified at that location AND has the skill */
    const myCerts = await db.select().from(schema.userLocations).where(eq(schema.userLocations.userId, userId));
    const mySkills = await db.select().from(schema.userSkills).where(eq(schema.userSkills.userId, userId));
    const certSet = new Set(myCerts.filter((c) => c.isCertified).map((c) => c.locationId));
    const skillSet = new Set(mySkills.map((s) => s.skillId));

    const available = openDrops.filter(
      (d) => certSet.has(d.locationId) && skillSet.has(d.skillId)
    );

    /* My own swap/drop requests */
    const mine = await db
      .select({
        requestId: schema.swapRequests.id,
        type: schema.swapRequests.type,
        status: schema.swapRequests.status,
        requesterNote: schema.swapRequests.requesterNote,
        managerNote: schema.swapRequests.managerNote,
        expiresAt: schema.swapRequests.expiresAt,
        createdAt: schema.swapRequests.createdAt,
        startAt: schema.shifts.startAt,
        endAt: schema.shifts.endAt,
        locationName: schema.locations.name,
        locationTz: schema.locations.timezone,
        skillName: schema.skills.name,
        targetName: schema.swapRequests.targetUserId,
      })
      .from(schema.swapRequests)
      .innerJoin(schema.shiftAssignments, eq(schema.swapRequests.assignmentId, schema.shiftAssignments.id))
      .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
      .innerJoin(schema.locations, eq(schema.shifts.locationId, schema.locations.id))
      .innerJoin(schema.skills, eq(schema.shifts.requiredSkillId, schema.skills.id))
      .where(eq(schema.swapRequests.requesterId, userId))
      .orderBy(schema.swapRequests.createdAt);

    /* Resolve target user names (two-step: drizzle self-join alias is awkward) */
    const allUsers = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users);
    const nameById = new Map(allUsers.map((u) => [u.id, u.name]));
    const mineWithTarget = mine.map((m) => ({ ...m, targetName: m.targetName ? nameById.get(m.targetName) ?? null : null }));

    return NextResponse.json({ available, mine: mineWithTarget });
  } catch (error) {
    console.error('Error fetching swaps data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
