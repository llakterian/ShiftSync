import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, and, or, not, gt, lt, lte, gte, between, sql } from 'drizzle-orm';
import { ConstraintResult, ShiftData } from './types';
import { differenceInHours, addDays, startOfWeek, endOfWeek, differenceInMinutes, startOfDay, endOfDay, getDay, format } from 'date-fns';

/* 1. Double Booking: No overlapping shifts */
export async function checkDoubleBooking(userId: string, shift: ShiftData): Promise<ConstraintResult> {
  const overlaps = await db.select().from(schema.shiftAssignments)
    .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
    .where(
      and(
        eq(schema.shiftAssignments.userId, userId),
        or(
          eq(schema.shiftAssignments.status, 'confirmed'),
          eq(schema.shiftAssignments.status, 'assigned')
        ),
        lt(schema.shifts.startAt, shift.endAt),
        gt(schema.shifts.endAt, shift.startAt),
        not(eq(schema.shifts.id, shift.id))
      )
    );

  if (overlaps.length > 0) {
    return {
      ok: false,
      rule: 'double_booking',
      severity: 'block',
      message: 'Staff member is already scheduled for an overlapping shift.',
    };
  }
  return { ok: true };
}

/* 2. Minimum Rest Period: 10 hours between shifts */
export async function checkMinRestPeriod(userId: string, shift: ShiftData): Promise<ConstraintResult> {
  const bufferStart = new Date(shift.startAt.getTime() - 10 * 60 * 60 * 1000);
  const bufferEnd = new Date(shift.endAt.getTime() + 10 * 60 * 60 * 1000);

  const nearbyShifts = await db.select().from(schema.shiftAssignments)
    .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
    .where(
      and(
        eq(schema.shiftAssignments.userId, userId),
        or(
          eq(schema.shiftAssignments.status, 'confirmed'),
          eq(schema.shiftAssignments.status, 'assigned')
        ),
        or(
          and(gte(schema.shifts.endAt, bufferStart), lte(schema.shifts.endAt, shift.startAt)),
          and(gte(schema.shifts.startAt, shift.endAt), lte(schema.shifts.startAt, bufferEnd))
        ),
        not(eq(schema.shifts.id, shift.id))
      )
    );

  if (nearbyShifts.length > 0) {
    return {
      ok: false,
      rule: 'min_rest',
      severity: 'block',
      message: 'Requires at least 10 hours of rest between shifts.',
    };
  }
  return { ok: true };
}

/* 3. Skill Match */
export async function checkSkillMatch(userId: string, shift: ShiftData): Promise<ConstraintResult> {
  const hasSkill = await db.select().from(schema.userSkills)
    .where(
      and(
        eq(schema.userSkills.userId, userId),
        eq(schema.userSkills.skillId, shift.requiredSkillId)
      )
    ).limit(1);

  if (hasSkill.length === 0) {
    return {
      ok: false,
      rule: 'skill_match',
      severity: 'block',
      message: 'Staff member does not have the required skill for this shift.',
    };
  }
  return { ok: true };
}

/* 4. Location Certification */
export async function checkLocationCertification(userId: string, shift: ShiftData): Promise<ConstraintResult> {
  const isCertified = await db.select().from(schema.userLocations)
    .where(
      and(
        eq(schema.userLocations.userId, userId),
        eq(schema.userLocations.locationId, shift.locationId),
        eq(schema.userLocations.isCertified, true)
      )
    ).limit(1);

  if (isCertified.length === 0) {
    return {
      ok: false,
      rule: 'location_certification',
      severity: 'block',
      message: 'Staff member is not certified for this location.',
    };
  }
  return { ok: true };
}

/* 5. Availability (checks recurring and overrides) */
export async function checkAvailability(userId: string, shift: ShiftData): Promise<ConstraintResult> {
  const shiftDate = startOfDay(shift.startAt);
  const shiftDayOfWeek = getDay(shiftDate);
  const shiftStartTime = format(shift.startAt, 'HH:mm:ss');
  const shiftEndTime = format(shift.endAt, 'HH:mm:ss');

  /* Check override first */
  const override = await db.select().from(schema.availabilityOverrides)
    .where(
      and(
        eq(schema.availabilityOverrides.userId, userId),
        eq(schema.availabilityOverrides.date, format(shiftDate, 'yyyy-MM-dd'))
      )
    ).limit(1);

  if (override.length > 0) {
    const ov = override[0];
    if (!ov.isAvailable) {
      return { ok: false, rule: 'availability', severity: 'block', message: 'Staff member is marked unavailable on this date.' };
    }
    if (ov.startTime && ov.endTime) {
      if (shiftStartTime < ov.startTime || shiftEndTime > ov.endTime) {
         return { ok: false, rule: 'availability', severity: 'block', message: 'Shift falls outside of available hours override.' };
      }
    }
    return { ok: true };
  }

  /* Check recurring availability */
  const windows = await db.select().from(schema.availabilityWindows)
    .where(
      and(
        eq(schema.availabilityWindows.userId, userId),
        eq(schema.availabilityWindows.dayOfWeek, shiftDayOfWeek),
        lte(schema.availabilityWindows.effectiveFrom, format(shiftDate, 'yyyy-MM-dd')),
        or(
          sql`${schema.availabilityWindows.effectiveUntil} IS NULL`,
          gte(schema.availabilityWindows.effectiveUntil, format(shiftDate, 'yyyy-MM-dd'))
        )
      )
    );

  const isCovered = windows.some(w => shiftStartTime >= w.startTime && shiftEndTime <= w.endTime);
  if (!isCovered) {
    return {
      ok: false,
      rule: 'availability',
      severity: 'block',
      message: 'Shift falls outside of recurring availability hours.',
    };
  }

  return { ok: true };
}

/* Helper to get hours for a period */
async function getHoursForPeriod(userId: string, start: Date, end: Date, excludeShiftId?: string) {
  const assignments = await db.select().from(schema.shiftAssignments)
    .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
    .where(
      and(
        eq(schema.shiftAssignments.userId, userId),
        eq(schema.shiftAssignments.status, 'confirmed'),
        gte(schema.shifts.startAt, start),
        lte(schema.shifts.startAt, end)
      )
    );
  
  let mins = 0;
  for (const a of assignments) {
    if (a.shifts.id !== excludeShiftId) {
      mins += Math.max(0, differenceInMinutes(a.shifts.endAt, a.shifts.startAt));
    }
  }
  return mins / 60;
}

/* 6. Daily Hours (8h warn, 12h block) */
export async function checkDailyHours(userId: string, shift: ShiftData): Promise<ConstraintResult> {
  const sStart = startOfDay(shift.startAt);
  const sEnd = endOfDay(shift.startAt);
  const existingHours = await getHoursForPeriod(userId, sStart, sEnd, shift.id);
  const newHours = differenceInMinutes(shift.endAt, shift.startAt) / 60;
  
  const total = existingHours + newHours;
  
  if (total > 12) {
    return { ok: false, rule: 'daily_hours', severity: 'block', message: `Daily hours would exceed 12 (${total.toFixed(1)}h).` };
  }
  if (total > 8) {
    return { ok: false, rule: 'daily_hours', severity: 'warn', message: `Daily hours exceed 8 (${total.toFixed(1)}h).` };
  }
  return { ok: true };
}

/* 7. Weekly Hours (35h warn, 40h block) */
export async function checkWeeklyHours(userId: string, shift: ShiftData): Promise<ConstraintResult> {
  const weekStart = startOfWeek(shift.startAt, { weekStartsOn: 1 }); // Monday start
  const weekEnd = endOfWeek(shift.startAt, { weekStartsOn: 1 });
  const existingHours = await getHoursForPeriod(userId, weekStart, weekEnd, shift.id);
  const newHours = differenceInMinutes(shift.endAt, shift.startAt) / 60;
  
  const total = existingHours + newHours;
  
  if (total > 40) {
    return { ok: false, rule: 'weekly_hours', severity: 'block', message: `Weekly hours would exceed 40 (${total.toFixed(1)}h). Overtime not permitted without override.` };
  }
  if (total >= 35) {
    return { ok: false, rule: 'weekly_hours', severity: 'warn', message: `Approaching overtime (${total.toFixed(1)}h).` };
  }
  return { ok: true };
}

/* 8. Consecutive Days (6 warn, 7 block) */
export async function checkConsecutiveDays(userId: string, shift: ShiftData): Promise<ConstraintResult> {
  const weekStart = startOfWeek(shift.startAt, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(shift.startAt, { weekStartsOn: 1 });
  
  const assignments = await db.select().from(schema.shiftAssignments)
    .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
    .where(
      and(
        eq(schema.shiftAssignments.userId, userId),
        eq(schema.shiftAssignments.status, 'confirmed'),
        gte(schema.shifts.startAt, weekStart),
        lte(schema.shifts.startAt, weekEnd)
      )
    );
    
  const daysWorked = new Set<number>();
  for (const a of assignments) {
    if (a.shifts.id !== shift.id) {
      daysWorked.add(getDay(a.shifts.startAt));
    }
  }
  
  daysWorked.add(getDay(shift.startAt)); // add new shift day
  const totalDays = daysWorked.size;
  
  if (totalDays >= 7) {
    return { ok: false, rule: 'consecutive_days', severity: 'block', message: 'Scheduling for a 7th consecutive day requires manager override.' };
  }
  if (totalDays === 6) {
    return { ok: false, rule: 'consecutive_days', severity: 'warn', message: 'Scheduling for 6 days this week.' };
  }
  return { ok: true };
}
