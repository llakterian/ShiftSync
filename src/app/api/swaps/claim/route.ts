import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/*
 * Claim a dropped shift (pick up an available shift).
 * the assignment transfers to the claimer, the drop request is approved, and
 * the original staff member is released (notification).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestId } = body as { requestId?: string };
    if (!requestId) {
      return NextResponse.json({ error: 'Missing requestId' }, { status: 400 });
    }

    const role = cookies().get('mock_role')?.value || 'staff';
    const email = role === 'admin' ? 'admin@coastaleats.com' : role === 'manager' ? 'east.manager@coastaleats.com' : 'john@coastaleats.com';
    const me = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (me.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const claimerId = me[0].id;

    /* The open drop request */
    const requestRows = await db
      .select()
      .from(schema.swapRequests)
      .where(and(eq(schema.swapRequests.id, requestId), eq(schema.swapRequests.type, 'drop'), eq(schema.swapRequests.status, 'pending')))
      .limit(1);
    if (requestRows.length === 0) {
      return NextResponse.json({ error: 'Drop request not found or already claimed' }, { status: 404 });
    }
    const dropRequest = requestRows[0];
    if (dropRequest.expiresAt.getTime() < Date.now()) {
      await db.update(schema.swapRequests).set({ status: 'expired' }).where(eq(schema.swapRequests.id, requestId));
      return NextResponse.json({ error: 'This drop request has expired' }, { status: 409 });
    }

    /* The assignment being released */
    const assignmentRows = await db
      .select()
      .from(schema.shiftAssignments)
      .where(eq(schema.shiftAssignments.id, dropRequest.assignmentId))
      .limit(1);
    if (assignmentRows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }
    const original = assignmentRows[0];
    if (original.userId === claimerId) {
      return NextResponse.json({ error: 'You cannot claim your own drop request' }, { status: 400 });
    }

    const shiftRows = await db.select().from(schema.shifts).where(eq(schema.shifts.id, original.shiftId)).limit(1);
    if (shiftRows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    const shift = shiftRows[0];

    /* Constraint engine: all 8 rules for the claimer */
    const { evaluateAssignment } = await import('@/lib/constraints/engine');
    const results = await evaluateAssignment(claimerId, {
      id: shift.id,
      locationId: shift.locationId,
      requiredSkillId: shift.requiredSkillId,
      startAt: shift.startAt,
      endAt: shift.endAt,
    }, true);

    const isBlocked = results.some((r) => !r.ok && r.severity === 'block');
    if (isBlocked) {
      return NextResponse.json(
        { success: false, error: 'You do not pass all constraints for this shift', results, status: 'blocked' },
        { status: 409 }
      );
    }

    /* Transfer: release the original assignment, assign to the claimer */
    await db.update(schema.shiftAssignments).set({ status: 'dropped' }).where(eq(schema.shiftAssignments.id, original.id));
    const inserted = await db
      .insert(schema.shiftAssignments)
      .values({ shiftId: shift.id, userId: claimerId, status: 'confirmed', assignedBy: null })
      .returning();

    await db.update(schema.swapRequests).set({ status: 'approved', targetUserId: claimerId }).where(eq(schema.swapRequests.id, requestId));

    /* Audit + notifications (spec §7, §9) */
    await db.insert(schema.auditLogs).values({
      entityType: 'assignment',
      entityId: inserted[0].id,
      action: 'claim_drop',
      beforeState: { userId: original.userId, status: original.status },
      afterState: { userId: claimerId, status: 'confirmed', droppedRequestId: requestId },
      actorId: claimerId,
    });
    await db.insert(schema.notifications).values([
      {
        userId: original.userId,
        type: 'shift_claimed',
        title: 'Your shift was claimed',
        body: 'Another staff member picked up your dropped shift. It is off your schedule.',
        payload: { shiftId: shift.id, requestId },
      },
      {
        userId: claimerId,
        type: 'shift_assigned',
        title: 'Shift claimed',
        body: 'You claimed a dropped shift. It has been added to your schedule.',
        payload: { shiftId: shift.id, requestId },
      },
    ]);

    return NextResponse.json({ success: true, assignment: inserted[0], results }, { status: 201 });
  } catch (error) {
    console.error('Error claiming shift:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
