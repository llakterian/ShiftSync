import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import * as schema from '@/lib/db/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [locations, skills] = await Promise.all([
      db.select().from(schema.locations).orderBy(schema.locations.name),
      db.select().from(schema.skills).orderBy(schema.skills.name),
    ]);
    return NextResponse.json({ locations, skills });
  } catch (error) {
    console.error('Error fetching locations/skills:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
