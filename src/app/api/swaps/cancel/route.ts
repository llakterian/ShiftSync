import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { and, eq } from 'drizzle-orm';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/*
 * Cancel the logged-in user's own pending swap/drop request (spec §6:
 * before manager approval, the requester can cancel).
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

    const rows = await db
      .select()
      .from(schema.swapRequests)
      .where(and(eq(schema.swapRequests.id, requestId), eq(schema.swapRequests.requesterId, me[0].id)))
      .limit(1);
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }
    if (rows[0].status !== 'pending') {
      return NextResponse.json({ error: `Request is already ${rows[0].status}` }, { status: 409 });
    }

    await db.update(schema.swapRequests).set({ status: 'cancelled' }).where(eq(schema.swapRequests.id, requestId));

    /* Notify the other parties (target colleague for swaps) */
    if (rows[0].type === 'swap' && rows[0].targetUserId) {
      await db.insert(schema.notifications).values({
        userId: rows[0].targetUserId,
        type: 'swap_cancelled',
        title: 'Swap request cancelled',
        body: `${me[0].name} cancelled their swap request.`,
        payload: { requestId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling swap request:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
