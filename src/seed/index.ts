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

async function seed() {
  console.log('Seeding database...');
  
  /* Create standard skills */
  const skillsData = [
    { name: 'bartender' },
    { name: 'line cook' },
    { name: 'server' },
    { name: 'host' },
  ];
  
  const insertedSkills = await db.insert(schema.skills)
    .values(skillsData)
    .onConflictDoNothing()
    .returning();
  
  if (insertedSkills.length === 0) {
    console.log('Skills already seeded, fetching existing...');
  }
  const allSkills = await db.select().from(schema.skills);
  console.log(`Skills total: ${allSkills.length}`);

  /* Create locations */
  const locationsData = [
    { name: 'Downtown', timezone: 'America/New_York', address: '123 Main St' },
    { name: 'Westside', timezone: 'America/New_York', address: '456 West Ave' },
    { name: 'Marina', timezone: 'America/Los_Angeles', address: '789 Ocean Blvd' },
    { name: 'Valley', timezone: 'America/Los_Angeles', address: '101 Valley Rd' },
  ];
  
  const insertedLocations = await db.insert(schema.locations)
    .values(locationsData)
    .onConflictDoNothing()
    .returning();
  
  const allLocations = await db.select().from(schema.locations);
  console.log(`Locations total: ${allLocations.length}`);

  /* Create Admins */
  await db.insert(schema.users).values([
    { email: 'admin@coastaleats.com', name: 'System Admin', role: 'admin', timezonePref: 'America/New_York' }
  ]).onConflictDoNothing();
  
  /* Create Managers */
  await db.insert(schema.users).values([
    { email: 'east.manager@coastaleats.com', name: 'East Manager', role: 'manager', timezonePref: 'America/New_York' },
    { email: 'west.manager@coastaleats.com', name: 'West Manager', role: 'manager', timezonePref: 'America/Los_Angeles' }
  ]).onConflictDoNothing();
  
  /* Create Staff */
  await db.insert(schema.users).values([
    { email: 'john@coastaleats.com', name: 'John Doe', role: 'staff', timezonePref: 'America/New_York' },
    { email: 'sarah@coastaleats.com', name: 'Sarah Smith', role: 'staff', timezonePref: 'America/New_York' },
    { email: 'maria@coastaleats.com', name: 'Maria Garcia', role: 'staff', timezonePref: 'America/Los_Angeles' }
  ]).onConflictDoNothing();

  const managerUsers = await db.select().from(schema.users).where(eq(schema.users.role, 'manager'));
  const staffUsers = await db.select().from(schema.users).where(eq(schema.users.role, 'staff'));

  console.log('Users seeded');
  
  /* Manager Location Assignments */
  await db.insert(schema.userLocations).values([
    { userId: managerUsers[0].id, locationId: allLocations[0].id, isCertified: true },
    { userId: managerUsers[0].id, locationId: allLocations[1].id, isCertified: true },
    { userId: managerUsers[1].id, locationId: allLocations[2].id, isCertified: true },
    { userId: managerUsers[1].id, locationId: allLocations[3].id, isCertified: true },
  ]).onConflictDoNothing();

  /* Staff Location Certifications */
  await db.insert(schema.userLocations).values([
    { userId: staffUsers[0].id, locationId: allLocations[0].id, isCertified: true }, // John @ Downtown
    { userId: staffUsers[1].id, locationId: allLocations[0].id, isCertified: true }, // Sarah @ Downtown
    { userId: staffUsers[1].id, locationId: allLocations[1].id, isCertified: true }, // Sarah @ Westside
    { userId: staffUsers[2].id, locationId: allLocations[2].id, isCertified: true }, // Maria @ Marina
  ]).onConflictDoNothing();

  /* Staff Skills */
  await db.insert(schema.userSkills).values([
    { userId: staffUsers[0].id, skillId: allSkills[0].id }, // John is bartender
    { userId: staffUsers[1].id, skillId: allSkills[2].id }, // Sarah is server
    { userId: staffUsers[2].id, skillId: allSkills[1].id }, // Maria is line cook
    { userId: staffUsers[2].id, skillId: allSkills[0].id }, // Maria is also bartender
  ]).onConflictDoNothing();
  
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
