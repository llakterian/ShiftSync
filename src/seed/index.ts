import { db } from '../lib/db/client';
import * as schema from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function seed() {
  console.log('Seeding database...');
  
  /* Create standard skills */
  const skillsData = [
    { name: 'bartender' },
    { name: 'line cook' },
    { name: 'server' },
    { name: 'host' },
  ];
  
  const insertedSkills = await db.insert(schema.skills).values(skillsData).returning();
  console.log(`Inserted ${insertedSkills.length} skills`);

  /* Create locations */
  const locationsData = [
    { name: 'Downtown', timezone: 'America/New_York', address: '123 Main St' },
    { name: 'Westside', timezone: 'America/New_York', address: '456 West Ave' },
    { name: 'Marina', timezone: 'America/Los_Angeles', address: '789 Ocean Blvd' },
    { name: 'Valley', timezone: 'America/Los_Angeles', address: '101 Valley Rd' },
  ];
  
  const insertedLocations = await db.insert(schema.locations).values(locationsData).returning();
  console.log(`Inserted ${insertedLocations.length} locations`);

  /* Create Admins */
  const adminUsers = await db.insert(schema.users).values([
    { email: 'admin@coastaleats.com', name: 'System Admin', role: 'admin', timezonePref: 'America/New_York' }
  ]).returning();
  
  /* Create Managers */
  const managerUsers = await db.insert(schema.users).values([
    { email: 'east.manager@coastaleats.com', name: 'East Manager', role: 'manager', timezonePref: 'America/New_York' },
    { email: 'west.manager@coastaleats.com', name: 'West Manager', role: 'manager', timezonePref: 'America/Los_Angeles' }
  ]).returning();
  
  /* Create Staff */
  const staffUsers = await db.insert(schema.users).values([
    { email: 'john@coastaleats.com', name: 'John Doe', role: 'staff', timezonePref: 'America/New_York' },
    { email: 'sarah@coastaleats.com', name: 'Sarah Smith', role: 'staff', timezonePref: 'America/New_York' },
    { email: 'maria@coastaleats.com', name: 'Maria Garcia', role: 'staff', timezonePref: 'America/Los_Angeles' }
  ]).returning();

  console.log('Users seeded');
  
  /* Manager Location Assignments */
  await db.insert(schema.userLocations).values([
    { userId: managerUsers[0].id, locationId: insertedLocations[0].id, isCertified: true },
    { userId: managerUsers[0].id, locationId: insertedLocations[1].id, isCertified: true },
    { userId: managerUsers[1].id, locationId: insertedLocations[2].id, isCertified: true },
    { userId: managerUsers[1].id, locationId: insertedLocations[3].id, isCertified: true },
  ]);

  /* Staff Location Certifications */
  await db.insert(schema.userLocations).values([
    { userId: staffUsers[0].id, locationId: insertedLocations[0].id, isCertified: true }, // John @ Downtown
    { userId: staffUsers[1].id, locationId: insertedLocations[0].id, isCertified: true }, // Sarah @ Downtown
    { userId: staffUsers[1].id, locationId: insertedLocations[1].id, isCertified: true }, // Sarah @ Westside
    { userId: staffUsers[2].id, locationId: insertedLocations[2].id, isCertified: true }, // Maria @ Marina
  ]);

  /* Staff Skills */
  await db.insert(schema.userSkills).values([
    { userId: staffUsers[0].id, skillId: insertedSkills[0].id }, // John is bartender
    { userId: staffUsers[1].id, skillId: insertedSkills[2].id }, // Sarah is server
    { userId: staffUsers[2].id, skillId: insertedSkills[1].id }, // Maria is line cook
    { userId: staffUsers[2].id, skillId: insertedSkills[0].id }, // Maria is also bartender
  ]);
  
  console.log('Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed!', err);
  process.exit(1);
});
