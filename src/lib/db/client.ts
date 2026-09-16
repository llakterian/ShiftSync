import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/* Ensure we don't open too many connections in serverless environments */
const connectionString = process.env.DATABASE_URL!;

/* Postgres client */
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
