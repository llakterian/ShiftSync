import { NextRequest } from 'next/server';
import postgres from 'postgres';

export const runtime = 'nodejs'; // Use Node.js runtime instead of Edge to maintain the persistent PG connection
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      // Connect specifically for listening (don't use the app's standard connection pool)
      const sql = postgres(process.env.DATABASE_URL!, {
        max: 1, // We only need 1 connection for the listener
        idle_timeout: 0, // Never close
      });

      // Listen to the PG notification channel
      await sql.listen('db_changes', (payload) => {
        const data = `data: ${payload}\n\n`;
        controller.enqueue(new TextEncoder().encode(data));
      });

      // Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        sql.end();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
