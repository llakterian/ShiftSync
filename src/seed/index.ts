import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';

const connectionString = process.env.DATABASE_URL!;
const sqlClient = postgres(connectionString, { max: 1 });
const db = drizzle(sqlClient, { schema });

/* Idempotent seed: safe to run repeatedly. Skills/locations/users use
 * onConflictDoNothing, everything else is keyed lookups + conditional inserts. */
async function seed() {
  console.log('Seeding database...');

  /* Create standard skills */
  const skillsData = [
    { name: 'bartender' },
    { name: 'line cook' },
    { name: 'server' },
    { name: 'host' },
  ];

  await db.insert(schema.skills).values(skillsData).onConflictDoNothing();
  const allSkills = await db.select().from(schema.skills);
  const skillByName = new Map(allSkills.map((s) => [s.name, s]));
  console.log(`Skills total: ${allSkills.length}`);

  /* Create locations */
  const locationsData = [
    { name: 'Downtown', timezone: 'America/New_York', address: '123 Main St' },
    { name: 'Westside', timezone: 'America/New_York', address: '456 West Ave' },
    { name: 'Marina', timezone: 'America/Los_Angeles', address: '789 Ocean Blvd' },
    { name: 'Valley', timezone: 'America/Los_Angeles', address: '101 Valley Rd' },
  ];

  await db.insert(schema.locations).values(locationsData).onConflictDoNothing();
  const allLocations = await db.select().from(schema.locations);
  const locByName = new Map(allLocations.map((l) => [l.name, l]));
  console.log(`Locations total: ${allLocations.length}`);

  /* Admin */
  await db.insert(schema.users).values([
    { email: 'admin@coastaleats.com', name: 'System Admin', role: 'admin', timezonePref: 'America/New_York' }
  ]).onConflictDoNothing();

  /* Managers: East owns Downtown + Westside, West owns Marina + Valley */
  await db.insert(schema.users).values([
    { email: 'east.manager@coastaleats.com', name: 'East Manager', role: 'manager', timezonePref: 'America/New_York' },
    { email: 'west.manager@coastaleats.com', name: 'West Manager', role: 'manager', timezonePref: 'America/Los_Angeles' }
  ]).onConflictDoNothing();

  /* Staff: 9 members covering the edge cases from the assessment spec:
   * - Ana (THE cross-timezone bartender): certified Downtown (ET) AND Marina (PT),
   *   availability 09:00-17:00 in each location's local time. Evaluator scenario 3.
   * - John: bartender @ Downtown (scenario 1 coverage path).
   * - Maria: line cook + bartender @ Marina.
   * - Sarah: server @ Downtown + Westside.
   * - The rest add depth so the fairness report and coverage lists are non-trivial. */
  const staffData = [
    { email: 'john@coastaleats.com', name: 'John Doe', tz: 'America/New_York' },
    { email: 'sarah@coastaleats.com', name: 'Sarah Smith', tz: 'America/New_York' },
    { email: 'maria@coastaleats.com', name: 'Maria Garcia', tz: 'America/Los_Angeles' },
    { email: 'ana@coastaleats.com', name: 'Ana Torres', tz: 'America/New_York' },
    { email: 'mike@coastaleats.com', name: 'Mike Turner', tz: 'America/New_York' },
    { email: 'priya@coastaleats.com', name: 'Priya Patel', tz: 'America/Los_Angeles' },
    { email: 'devon@coastaleats.com', name: 'Devon Lee', tz: 'America/New_York' },
    { email: 'lucia@coastaleats.com', name: 'Lucia Rossi', tz: 'America/Los_Angeles' },
    { email: 'sam@coastaleats.com', name: 'Sam Brooks', tz: 'America/New_York' },
  ];
  await db.insert(schema.users).values(
    staffData.map((s) => ({ email: s.email, name: s.name, role: 'staff' as const, timezonePref: s.tz }))
  ).onConflictDoNothing();

  const managerUsers = await db.select().from(schema.users).where(eq(schema.users.role, 'manager'));
  const staffUsers = await db.select().from(schema.users);
  const staffByEmail = new Map(staffUsers.map((u) => [u.email, u]));
  const mgr = (email: string) => staffByEmail.get(email) ?? managerUsers[0];

  console.log(`Users seeded (${staffUsers.length} total)`);

  /* Manager Location Assignments */
  await db.insert(schema.userLocations).values([
    { userId: mgr('east.manager@coastaleats.com').id, locationId: locByName.get('Downtown')!.id, isCertified: true },
    { userId: mgr('east.manager@coastaleats.com').id, locationId: locByName.get('Westside')!.id, isCertified: true },
    { userId: mgr('west.manager@coastaleats.com').id, locationId: locByName.get('Marina')!.id, isCertified: true },
    { userId: mgr('west.manager@coastaleats.com').id, locationId: locByName.get('Valley')!.id, isCertified: true },
  ]).onConflictDoNothing();

  /* Staff Location Certifications: Ana is certified in BOTH timezones (ET + PT) */
  const certRows: { userId: string; locationId: string; isCertified: boolean }[] = [
    { userId: staffByEmail.get('john@coastaleats.com')!.id, locationId: locByName.get('Downtown')!.id, isCertified: true },
    { userId: staffByEmail.get('sarah@coastaleats.com')!.id, locationId: locByName.get('Downtown')!.id, isCertified: true },
    { userId: staffByEmail.get('sarah@coastaleats.com')!.id, locationId: locByName.get('Westside')!.id, isCertified: true },
    { userId: staffByEmail.get('maria@coastaleats.com')!.id, locationId: locByName.get('Marina')!.id, isCertified: true },
    { userId: staffByEmail.get('ana@coastaleats.com')!.id, locationId: locByName.get('Downtown')!.id, isCertified: true },
    { userId: staffByEmail.get('ana@coastaleats.com')!.id, locationId: locByName.get('Marina')!.id, isCertified: true },
    { userId: staffByEmail.get('mike@coastaleats.com')!.id, locationId: locByName.get('Westside')!.id, isCertified: true },
    { userId: staffByEmail.get('priya@coastaleats.com')!.id, locationId: locByName.get('Marina')!.id, isCertified: true },
    { userId: staffByEmail.get('devon@coastaleats.com')!.id, locationId: locByName.get('Downtown')!.id, isCertified: true },
    { userId: staffByEmail.get('lucia@coastaleats.com')!.id, locationId: locByName.get('Valley')!.id, isCertified: true },
    { userId: staffByEmail.get('sam@coastaleats.com')!.id, locationId: locByName.get('Downtown')!.id, isCertified: true },
  ];
  /* user_locations has no natural key: dedupe against the in-batch list AND
   * existing rows so re-running never creates duplicates */
  const existingCerts = await db.select().from(schema.userLocations);
  const seen = new Set(existingCerts.map((r) => `${r.userId}:${r.locationId}`));
  const uniqueCerts = certRows.filter((r) => {
    const k = `${r.userId}:${r.locationId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  if (uniqueCerts.length > 0) {
    await db.insert(schema.userLocations).values(uniqueCerts).onConflictDoNothing();
  }

  /* Staff Skills: Ana has bartender (the cross-tz one), Maria line cook + bartender */
  await db.insert(schema.userSkills).values([
    { userId: staffByEmail.get('john@coastaleats.com')!.id, skillId: skillByName.get('bartender')!.id },
    { userId: staffByEmail.get('sarah@coastaleats.com')!.id, skillId: skillByName.get('server')!.id },
    { userId: staffByEmail.get('maria@coastaleats.com')!.id, skillId: skillByName.get('line cook')!.id },
    { userId: staffByEmail.get('maria@coastaleats.com')!.id, skillId: skillByName.get('bartender')!.id },
    { userId: staffByEmail.get('ana@coastaleats.com')!.id, skillId: skillByName.get('bartender')!.id },
    { userId: staffByEmail.get('ana@coastaleats.com')!.id, skillId: skillByName.get('server')!.id },
    { userId: staffByEmail.get('mike@coastaleats.com')!.id, skillId: skillByName.get('host')!.id },
    { userId: staffByEmail.get('priya@coastaleats.com')!.id, skillId: skillByName.get('server')!.id },
    { userId: staffByEmail.get('devon@coastaleats.com')!.id, skillId: skillByName.get('line cook')!.id },
    { userId: staffByEmail.get('lucia@coastaleats.com')!.id, skillId: skillByName.get('host')!.id },
    { userId: staffByEmail.get('sam@coastaleats.com')!.id, skillId: skillByName.get('bartender')!.id },
  ]).onConflictDoNothing();

  /* Recurring availability windows (9am-5pm ET for Ana; varied patterns for others).
   * Windows are evaluated in the LOCATION's timezone per the constraint engine. */
  const availRows: { userId: string; dayOfWeek: number; startTime: string; endTime: string; effectiveFrom: string }[] = [];
  const pushWeek = (email: string, start: string, end: string, days: number[]) => {
    const u = staffByEmail.get(email)!;
    for (const d of days) {
      availRows.push({ userId: u.id, dayOfWeek: d, startTime: start, endTime: end, effectiveFrom: '2026-01-01' });
    }
  };
  /* Ana: 9am-5pm every day (evaluator sets this at both ET and PT locations) */
  pushWeek('ana@coastaleats.com', '09:00:00', '17:00:00', [0, 1, 2, 3, 4, 5, 6]);
  pushWeek('john@coastaleats.com', '09:00:00', '23:00:00', [1, 2, 3, 4, 5]);
  pushWeek('john@coastaleats.com', '12:00:00', '22:00:00', [6, 0]);
  pushWeek('sarah@coastaleats.com', '08:00:00', '16:00:00', [1, 2, 3, 4, 5]);
  pushWeek('maria@coastaleats.com', '15:00:00', '23:00:00', [4, 5, 6, 0]);
  pushWeek('mike@coastaleats.com', '17:00:00', '01:00:00', [4, 5, 6]);
  pushWeek('priya@coastaleats.com', '09:00:00', '17:00:00', [1, 2, 3, 4]);
  pushWeek('devon@coastaleats.com', '10:00:00', '18:00:00', [2, 3, 4, 5, 6]);
  pushWeek('lucia@coastaleats.com', '16:00:00', '00:00:00', [5, 6, 0]);
  pushWeek('sam@coastaleats.com', '09:00:00', '21:00:00', [1, 2, 3, 4, 5, 6]);

  /* availability_windows has no natural key either: dedupe against the in-batch
   * list AND existing rows so re-running never creates duplicates */
  const existingAvail = await db.select().from(schema.availabilityWindows);
  const seenAvail = new Set(existingAvail.map((r) => `${r.userId}:${r.dayOfWeek}:${r.startTime}`));
  const uniqueAvail = availRows.filter((r) => {
    const k = `${r.userId}:${r.dayOfWeek}:${r.startTime}`;
    if (seenAvail.has(k)) return false;
    seenAvail.add(k);
    return true;
  });
  if (uniqueAvail.length > 0) {
    await db.insert(schema.availabilityWindows).values(uniqueAvail).onConflictDoNothing();
  }

  /* One-off override: Ana takes next Monday off (time off example) */
  const nextMonday = new Date();
  const dayDiff = (nextMonday.getUTCDay() + 6) % 7;
  nextMonday.setUTCDate(nextMonday.getUTCDate() + (7 - dayDiff));
  const mondayStr = nextMonday.toISOString().slice(0, 10);
  const anaId = staffByEmail.get('ana@coastaleats.com')!.id;
  const existingOverride = await db.select().from(schema.availabilityOverrides)
    .where(sql`${schema.availabilityOverrides.userId} = ${anaId} and ${schema.availabilityOverrides.date} = ${mondayStr}`)
    .limit(1);
  if (existingOverride.length === 0) {
    await db.insert(schema.availabilityOverrides).values({
      userId: anaId,
      date: mondayStr,
      isAvailable: false,
    });
  }

  /* Demo schedule with a PRE-EXISTING CONFLICT (spec deliverable 3):
   * Mike is double-booked Friday evening: Westside host shift AND Downtown
   * bartender shift overlapping, both 'assigned'. The evaluator sees the
   * conflict in the grid/analytics and the constraint engine reports it. */
  const thisFriday = new Date();
  const fridayDiff = (5 - thisFriday.getUTCDay() + 7) % 7;
  thisFriday.setUTCDate(thisFriday.getUTCDate() + fridayDiff);
  const fridayDate = thisFriday.toISOString().slice(0, 10);

  /* Wall-clock helpers: September EDT = UTC-04:00. Overnight shifts end the
   * NEXT calendar day, so compute the next date instead of string surgery. */
  const edt = (dateStr: string, timeStr: string) => new Date(`${dateStr}T${timeStr}:00-04:00`);
  const nextDay = (dateStr: string) => {
    const d = new Date(`${dateStr}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  const mikeId = staffByEmail.get('mike@coastaleats.com')!.id;
  const eastId = mgr('east.manager@coastaleats.com').id;

  /* Skip demo-shift creation if this week's Friday already has them */
  const fridayShifts = await db
    .select()
    .from(schema.shifts)
    .where(sql`${schema.shifts.startAt} >= ${fridayDate + 'T00:00:00Z'} and ${schema.shifts.startAt} < ${fridayDate + 'T23:59:59Z'}`);
  const hasConflictShifts = fridayShifts.some((s) => s.locationId === locByName.get('Westside')!.id && s.requiredSkillId === skillByName.get('host')!.id);

  if (!hasConflictShifts) {
    /* Downtown Friday 17:00-01:00 (overnight, ends next day) bartender */
    const downtownShift = await db.insert(schema.shifts).values({
      locationId: locByName.get('Downtown')!.id,
      requiredSkillId: skillByName.get('bartender')!.id,
      startAt: edt(fridayDate, '17:00'),
      endAt: edt(nextDay(fridayDate), '01:00'),
      headcountNeeded: 1,
      status: 'published' as const,
      createdBy: eastId,
      publishedAt: new Date(),
    }).returning();
    /* Westside Friday 18:00-00:00 (overnight, ends next day) host:
     * overlaps the Downtown shift for Mike = the pre-existing conflict */
    const westsideShift = await db.insert(schema.shifts).values({
      locationId: locByName.get('Westside')!.id,
      requiredSkillId: skillByName.get('host')!.id,
      startAt: edt(fridayDate, '18:00'),
      endAt: edt(nextDay(fridayDate), '00:00'),
      headcountNeeded: 1,
      status: 'published' as const,
      createdBy: eastId,
      publishedAt: new Date(),
    }).returning();

    await db.insert(schema.shiftAssignments).values([
      { shiftId: downtownShift[0].id, userId: mikeId, status: 'assigned' as const, assignedBy: eastId },
      { shiftId: westsideShift[0].id, userId: mikeId, status: 'assigned' as const, assignedBy: eastId },
    ]);
    console.log('Demo conflict schedule created (Mike double-booked Friday)');
  } else {
    console.log('Demo conflict shifts already present, skipping');
  }

  console.log('Applying triggers for real-time SSE...');
  const triggersSql = fs.readFileSync(path.join(__dirname, '../lib/db/triggers.sql'), 'utf-8');
  await db.execute(sql.raw(triggersSql));

  console.log('Seed and triggers complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed!', err);
  process.exit(1);
});
