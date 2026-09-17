import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq, and, or } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { evaluateAssignment } from '@/lib/constraints/engine';

export const dynamic = 'force-dynamic';

/*
 * Confirm an assignment with DB-level concurrency protection.
 *
 * Two managers assigning the same staff to overlapping shifts at the same
 * moment (Scenario 4) must not both succeed. Application-level checks race;
 * the serialized decision happens here inside a single transaction:
 *
 *   pg_advisory_xact_lock(hashtext(userId))  -- one writer per staff member
 *   re-run the constraint engine             -- reads committed state
 *   insert the assignment                    -- commit releases the lock
 *
 * The second concurrent request blocks on the advisory lock until the first
 * transaction commits, then its fresh engine run sees the new assignment and
 * returns the double-booking block.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, shiftId, overrideReason } = body as {
      userId?: string;
      shiftId?: string;
      overrideReason?: string;
    };

    if (!userId || !shiftId) {
      return NextResponse.json({ error: 'Missing userId or shiftId' }, { status: 400 });
    }

    /* Fetch the shift */
    const shiftResult = await db.select().from(schema.shifts).where(eq(schema.shifts.id, shiftId)).limit(1);
    if (shiftResult.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    const shift = shiftResult[0];

    /* Validate headcount headroom before locking (cheap check first) */
    const countRows = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(schema.shiftAssignments)
      .where(
        and(
          eq(schema.shiftAssignments.shiftId, shiftId),
          or(eq(schema.shiftAssignments.status, 'assigned'), eq(schema.shiftAssignments.status, 'confirmed'))
        )
      );
    const assignedCount = countRows[0]?.n ?? 0;
    if (assignedCount >= shift.headcountNeeded) {
      return NextResponse.json({ error: 'Shift is already fully staffed' }, { status: 409 });
    }

    /* Serialized per-staff decision: engine re-check + insert inside one
     * transaction guarded by a transaction-scoped advisory lock on the user. */
    const outcome = await db.transaction(async (tx) => {
      /* One writer per staff member: concurrent assigns for the same user
       * queue here; the lock auto-releases at commit/rollback. */
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${userId}))`);

      /* Re-run the full engine INSIDE the lock against committed state */
      const results = await evaluateAssignment(userId, {
        id: shift.id,
        locationId: shift.locationId,
        requiredSkillId: shift.requiredSkillId,
        startAt: shift.startAt,
        endAt: shift.endAt,
      }, true);

      const isBlocked = results.some((r) => !r.ok && r.severity === 'block');
      const needsOverride = results.some((r) => !r.ok && r.severity === 'override');

      if (isBlocked) {
        return { ok: false as const, results, blocked: true, needsOverride: false };
      }

      /* 'override' (7th consecutive day) requires a documented reason (spec §4) */
      if (needsOverride && (!overrideReason || overrideReason.trim().length === 0)) {
        return { ok: false as const, results, blocked: false, needsOverride: true };
      }

      const inserted = await tx
        .insert(schema.shiftAssignments)
        .values({
          shiftId: shift.id,
          userId,
          status: 'confirmed',
          assignedBy: null,
        })
        .returning();

      /* Audit trail: who/when/what (spec §9); override reason lands here */
      await tx.insert(schema.auditLogs).values({
        entityType: 'assignment',
        entityId: inserted[0].id,
        action: 'confirm',
        beforeState: null,
        afterState: {
          shiftId: shift.id,
          userId,
          status: 'confirmed',
          overrideReason: overrideReason?.trim() || null,
        },
        actorId: null,
      });

      /* Notify the assigned staff member (spec §7) */
      await tx.insert(schema.notifications).values({
        userId,
        type: 'shift_assigned',
        title: 'New shift assigned',
        body: 'You have been assigned a new shift. Check your upcoming shifts.',
        payload: { shiftId: shift.id },
      });

      return { ok: true as const, results, blocked: false, needsOverride: false, assignment: inserted[0] };
    });

    if (!outcome.ok) {
      return NextResponse.json(
        {
          success: false,
          error: outcome.blocked
            ? 'Assignment blocked by constraint engine'
            : 'Override reason required for this assignment',
          results: outcome.results,
          status: outcome.blocked ? 'blocked' : 'override_required',
          overrideReasonRequired: outcome.needsOverride,
        },
        { status: outcome.blocked ? 409 : 422 }
      );
    }

    /* Other tabs show fresh data on next navigation */
    revalidatePath('/manager/schedule');
    revalidatePath('/manager/analytics');
    revalidatePath('/staff/schedule');

    return NextResponse.json({ success: true, assignment: outcome.assignment, results: outcome.results }, { status: 201 });
  } catch (error) {
    console.error('Error confirming assignment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
