import { z } from 'zod';
import { db } from '../db/client';
import * as schema from '../db/schema';
import { eq, and, or, gte, lte, sql } from 'drizzle-orm';
import { differenceInMinutes, startOfWeek, endOfWeek, format } from 'date-fns';
import { getCoverageSuggestions } from '../constraints/suggestions';
import { ShiftData } from '../constraints/types';

/*
 * Real DB-backed tool definitions for the LLM.
 * Coverage suggestions come from the deterministic constraint engine
 * (getCoverageSuggestions), never from the model. Data is always real.
 */

/* Look up a location by id OR name (the model may pass either) */
async function resolveLocation(locationIdOrName: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(locationIdOrName);
  const rows = await db
    .select()
    .from(schema.locations)
    .where(
      isUuid
        ? eq(schema.locations.id, locationIdOrName)
        : sql`lower(${schema.locations.name}) = ${locationIdOrName.toLowerCase()}`
    )
    .limit(1);
  return rows[0] ?? null;
}

export const getAvailableStaffTool = {
  description: 'Find available staff for a specific shift or time block. Returns real staff from the database who have the required skill, are certified for the location, and pass all scheduling constraints.',
  inputSchema: z.object({
    location: z.string().describe('The location ID or name (e.g. "Downtown", "Marina")'),
    skillName: z.string().describe('The name of the required skill (e.g. bartender, server)'),
    date: z.string().describe('The date in YYYY-MM-DD format'),
    startTime: z.string().optional().describe('Optional start time HH:mm (defaults to 17:00)'),
    endTime: z.string().optional().describe('Optional end time HH:mm (defaults to 01:00 next day)'),
  }),
  execute: async ({ location, skillName, date, startTime, endTime }: {
    location: string;
    skillName: string;
    date: string;
    startTime?: string;
    endTime?: string;
  }) => {
    const loc = await resolveLocation(location);
    if (!loc) {
      return { error: `Location "${location}" not found. Valid locations: Downtown, Westside, Marina, Valley.` };
    }

    /* Resolve the requested skill */
    const skillRows = await db
      .select()
      .from(schema.skills)
      .where(sql`lower(${schema.skills.name}) = ${skillName.toLowerCase()}`)
      .limit(1);
    if (skillRows.length === 0) {
      const allSkills = await db.select().from(schema.skills);
      return { error: `Skill "${skillName}" not found. Valid skills: ${allSkills.map((s) => s.name).join(', ')}.` };
    }

    /* Build the shift window in the location's timezone (spec §8).
     * September offsets: EDT = -04:00, PDT = -07:00. */
    const tz = loc.timezone;
    const start = startTime || '17:00';
    const end = endTime || '01:00';
    const offset = tz === 'America/Los_Angeles' ? '-07:00' : '-04:00';
    let endDate = date;
    if (end <= start) {
      const d = new Date(`${date}T00:00:00Z`);
      d.setUTCDate(d.getUTCDate() + 1);
      endDate = d.toISOString().slice(0, 10);
    }
    const shift: ShiftData = {
      id: '00000000-0000-0000-0000-000000000000', // probe shift (excluded from conflict checks)
      locationId: loc.id,
      requiredSkillId: skillRows[0].id,
      startAt: new Date(`${date}T${start}:00${offset}`),
      endAt: new Date(`${endDate}T${end}:00${offset}`),
    };

    /* Deterministic engine suggestions: qualified staff only, with warnings */
    const suggestions = await getCoverageSuggestions(shift);

    /* Add hours-this-week context per suggestion for the manager's fairness view */
    const weekStart = startOfWeek(shift.startAt, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(shift.startAt, { weekStartsOn: 1 });
    const enriched = await Promise.all(
      suggestions.map(async (s) => {
        const assignments = await db
          .select({
            startAt: schema.shifts.startAt,
            endAt: schema.shifts.endAt,
          })
          .from(schema.shiftAssignments)
          .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
          .where(
            and(
              eq(schema.shiftAssignments.userId, s.userId),
              or(eq(schema.shiftAssignments.status, 'assigned'), eq(schema.shiftAssignments.status, 'confirmed')),
              gte(schema.shifts.startAt, weekStart),
              lte(schema.shifts.startAt, weekEnd)
            )
          );
        const mins = assignments.reduce(
          (acc, a) => acc + Math.max(0, differenceInMinutes(a.endAt, a.startAt)),
          0
        );
        return {
          name: s.name,
          matchingSkill: skillRows[0].name,
          hoursThisWeek: Math.round((mins / 60) * 10) / 10,
          note: s.reason,
        };
      })
    );

    return {
      location: loc.name,
      timezone: loc.timezone,
      date,
      window: `${start} to ${end} ${tz === 'America/Los_Angeles' ? 'PT' : 'ET'}`,
      availableStaff: enriched,
      count: enriched.length,
      note: enriched.length === 0
        ? 'No staff pass all constraints for this window. Consider changing the shift time or certifying more staff.'
        : 'These staff members have the required skill, are certified for this location, and pass all scheduling constraints.',
    };
  },
};

export const checkOvertimeRisksTool = {
  description: 'Identify staff members who are at risk of hitting overtime this week. Returns real projected hours from the database.',
  inputSchema: z.object({
    location: z.string().optional().describe('Optional location ID or name to filter by (e.g. "Downtown")'),
  }),
  execute: async ({ location }: { location?: string }) => {
    let loc = null;
    if (location) {
      loc = await resolveLocation(location);
      if (!loc) {
        return { error: `Location "${location}" not found. Valid locations: Downtown, Westside, Marina, Valley.` };
      }
    }

    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekEnd = endOfWeek(new Date(), { weekStartsOn: 1 });

    /* All active assignments this week, with the shift's location for filtering */
    const rows = await db
      .select({
        userId: schema.users.id,
        name: schema.users.name,
        startAt: schema.shifts.startAt,
        endAt: schema.shifts.endAt,
        locationId: schema.shifts.locationId,
        locationName: schema.locations.name,
      })
      .from(schema.shiftAssignments)
      .innerJoin(schema.users, eq(schema.shiftAssignments.userId, schema.users.id))
      .innerJoin(schema.shifts, eq(schema.shiftAssignments.shiftId, schema.shifts.id))
      .innerJoin(schema.locations, eq(schema.shifts.locationId, schema.locations.id))
      .where(
        and(
          or(eq(schema.shiftAssignments.status, 'assigned'), eq(schema.shiftAssignments.status, 'confirmed')),
          gte(schema.shifts.startAt, weekStart),
          lte(schema.shifts.startAt, weekEnd)
        )
      );

    /* Projected hours per staff from real assignments */
    const byUser = new Map<string, { name: string; minutes: number; locations: Set<string> }>();
    for (const r of rows) {
      if (loc && r.locationId !== loc.id) continue;
      if (!byUser.has(r.userId)) {
        byUser.set(r.userId, { name: r.name, minutes: 0, locations: new Set() });
      }
      const u = byUser.get(r.userId)!;
      u.minutes += Math.max(0, differenceInMinutes(r.endAt, r.startAt));
      u.locations.add(r.locationName);
    }

    const risks = Array.from(byUser.values())
      .map((u) => {
        const hours = u.minutes / 60;
        const risk = hours > 40 ? 'Critical' : hours >= 35 ? 'High' : hours >= 32 ? 'Moderate' : 'Low';
        return {
          name: u.name,
          projectedHours: Math.round(hours * 10) / 10,
          locations: Array.from(u.locations).join(', '),
          risk,
        };
      })
      .filter((r) => r.risk !== 'Low')
      .sort((a, b) => b.projectedHours - a.projectedHours);

    return {
      weekStart: format(weekStart, 'yyyy-MM-dd'),
      weekEnd: format(weekEnd, 'yyyy-MM-dd'),
      location: loc ? loc.name : 'All locations',
      risks,
      note: risks.length === 0
        ? 'No staff are at overtime risk this week.'
        : 'Projected hours include assigned and confirmed shifts for the current week.',
    };
  },
};
