import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env.local' });

const connectionString = process.env.DATABASE_URL!;

const runMigrate = async () => {
  console.log('Running migrations...');
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);
  await migrate(db, { migrationsFolder: 'drizzle' });
  console.log('Migrations complete!');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('Migration failed!', err);
  process.exit(1);
});
