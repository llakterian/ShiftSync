import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq, and, gte, lte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

/*
 * Publish/unpublish a week's shifts for a location.
 * Publish = shift status draft -> published, stamps publishedAt, notifies
 * assigned staff via the notifications table (spec §2, §7).
 */
export async function POST(req: NextRequest) {
  try {
    /* Authorization: only managers/admins can publish */
    const role = cookies().get('mock_role')?.value || 'staff';
    if (role === 'staff') {
      return NextResponse.json({ error: 'Only managers can publish schedules' }, { status: 403 });
    }

    const body = await req.json();
    const { weekStart, locationId, action } = body as {
      weekStart?: string;
      locationId?: string;
      action?: 'publish' | 'unpublish';
    };

    if (!weekStart || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) {
      return NextResponse.json({ error: 'Missing or invalid weekStart (YYYY-MM-DD)' }, { status: 400 });
    }

    const weekStartTime = new Date(`${weekStart}T00:00:00Z`);
    const weekEndTime = new Date(weekStartTime.getTime() + 7 * 24 * 60 * 60 * 1000);

    const where = locationId
      ? and(
          gte(schema.shifts.startAt, weekStartTime),
          lte(schema.shifts.startAt, weekEndTime),
          eq(schema.shifts.locationId, locationId)
        )
      : and(gte(schema.shifts.startAt, weekStartTime), lte(schema.shifts.startAt, weekEndTime));

    const targets = await db.select().from(schema.shifts).where(where);
    if (targets.length === 0) {
      return NextResponse.json({ error: 'No shifts in this week to publish' }, { status: 400 });
    }

    const publish = action !== 'unpublish';
    const updated = await db
      .update(schema.shifts)
      .set(publish ? { status: 'published', publishedAt: new Date() } : { status: 'draft', publishedAt: null })
      .where(where)
      .returning({ id: schema.shifts.id });

    /* Notify assigned staff about each published shift (in-app notification center, spec §7) */
    if (publish) {
      const assignments = await db
        .select({ userId: schema.shiftAssignments.userId, shiftId: schema.shiftAssignments.shiftId })
        .from(schema.shiftAssignments)
        .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
        .where(and(where, eq(schema.shifts.status, 'published')));

      if (assignments.length > 0) {
        await db.insert(schema.notifications).values(
          assignments.map((a) => ({
            userId: a.userId,
            type: 'schedule_published',
            title: 'Schedule published',
            body: 'Your schedule for this week has been published. Check your upcoming shifts.',
            payload: { shiftId: a.shiftId, weekStart },
          }))
        );
      }
    }

    revalidatePath('/manager/schedule');
    revalidatePath('/staff/schedule');
    revalidatePath('/manager/analytics');

    return NextResponse.json({ published: publish, affected: updated.length });
  } catch (error) {
    console.error('Error publishing schedule:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}