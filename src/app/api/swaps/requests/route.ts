import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { and, eq, count } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/*
 * Create a swap or drop request from the logged-in staff persona.
 * - swap: needs a targetUserId (colleague to swap with)
 * - drop: no target; lands on the Available to Pick Up board
 * Enforces the 3-pending-requests limit (spec §5) and a 24h-before-shift
 * expiry on drop requests.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId, type, targetUserId, note } = body as {
      assignmentId?: string;
      type?: 'swap' | 'drop';
      targetUserId?: string;
      note?: string;
    };

    if (!assignmentId || !type || !['swap', 'drop'].includes(type)) {
      return NextResponse.json({ error: 'Missing or invalid assignmentId/type (swap|drop)' }, { status: 400 });
    }
    if (type === 'swap' && !targetUserId) {
      return NextResponse.json({ error: 'Swap requests need a targetUserId' }, { status: 400 });
    }

    const role = cookies().get('mock_role')?.value || 'staff';
    const email = role === 'admin' ? 'admin@coastaleats.com' : role === 'manager' ? 'east.manager@coastaleats.com' : 'john@coastaleats.com';
    const me = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    if (me.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const requesterId = me[0].id;

    /* The assignment must belong to the requester */
    const assignmentRows = await db
      .select()
      .from(schema.shiftAssignments)
      .where(and(eq(schema.shiftAssignments.id, assignmentId), eq(schema.shiftAssignments.userId, requesterId)))
      .limit(1);
    if (assignmentRows.length === 0) {
      return NextResponse.json({ error: 'Assignment not found for this user' }, { status: 404 });
    }

    /* 3-pending limit (spec §5): swap AND drop requests combined */
    const pendingRows = await db
      .select({ n: count() })
      .from(schema.swapRequests)
      .where(and(eq(schema.swapRequests.requesterId, requesterId), eq(schema.swapRequests.status, 'pending')));
    if (Number(pendingRows[0]?.n ?? 0) >= 3) {
      return NextResponse.json(
        { error: 'You already have 3 pending requests. Cancel one before submitting another.' },
        { status: 409 }
      );
    }

    /* Drop requests expire 24h before the shift starts (spec §5) */
    const shiftRows = await db
      .select()
      .from(schema.shifts)
      .where(eq(schema.shifts.id, assignmentRows[0].shiftId))
      .limit(1);
    if (shiftRows.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }
    const expiry = new Date(shiftRows[0].startAt.getTime() - 24 * 60 * 60 * 1000);
    if (expiry.getTime() < Date.now()) {
      return NextResponse.json(
        { error: 'Too late: drop requests must be submitted at least 24 hours before the shift starts.' },
        { status: 409 }
      );
    }

    const inserted = await db
      .insert(schema.swapRequests)
      .values({
        requesterId,
        assignmentId,
        targetUserId: targetUserId ?? null,
        type,
        status: 'pending',
        requesterNote: note?.trim() || null,
        expiresAt: expiry,
      })
      .returning();

    /* Notify: target colleague for swaps; manager(s) for drops (spec §7) */
    if (type === 'swap' && targetUserId) {
      await db.insert(schema.notifications).values({
        userId: targetUserId,
        type: 'swap_request',
        title: 'Swap request received',
        body: `${me[0].name} wants to swap a shift with you. Open your notifications to respond.`,
        payload: { requestId: inserted[0].id, assignmentId },
      });
    } else {
      /* Managers for the shift's location */
      const managerRows = await db
        .select({ userId: schema.userLocations.userId })
        .from(schema.userLocations)
        .innerJoin(schema.users, eq(schema.userLocations.userId, schema.users.id))
        .where(and(eq(schema.userLocations.locationId, shiftRows[0].locationId), eq(schema.users.role, 'manager')));
      const targets = new Set(managerRows.map((m) => m.userId));
      if (targets.size > 0) {
        await db.insert(schema.notifications).values(
          Array.from(targets).map((userId) => ({
            userId,
            type: 'drop_request',
            title: 'Drop request needs claiming',
            body: `${me[0].name} dropped a shift. It is on the pick-up board for qualified staff.`,
            payload: { requestId: inserted[0].id, assignmentId },
          }))
        );
      }
    }

    return NextResponse.json({ success: true, request: inserted[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating swap request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
