import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { evaluateAssignment } from '@/lib/constraints/engine';
import { ShiftData } from '@/lib/constraints/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, shiftId } = body;

    if (!userId || !shiftId) {
      return NextResponse.json({ error: 'Missing userId or shiftId' }, { status: 400 });
    }

    /* Fetch the shift */
    const shiftResult = await db.select().from(schema.shifts).where(eq(schema.shifts.id, shiftId)).limit(1);
    if (shiftResult.length === 0) {
      return NextResponse.json({ error: 'Shift not found' }, { status: 404 });
    }

    const shift = shiftResult[0];
    const shiftData: ShiftData = {
      id: shift.id,
      locationId: shift.locationId,
      requiredSkillId: shift.requiredSkillId,
      startAt: shift.startAt,
      endAt: shift.endAt,
    };

    /* Run the constraint engine */
    const results = await evaluateAssignment(userId, shiftData, true);

    const isBlocked = results.some((r) => !r.ok && r.severity === 'block');
    const isWarning = results.some((r) => !r.ok && r.severity === 'warn');

    return NextResponse.json({
      success: !isBlocked,
      results,
      status: isBlocked ? 'blocked' : isWarning ? 'warning' : 'ok',
    });
  } catch (error) {
    console.error('Error checking assignment constraints:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
