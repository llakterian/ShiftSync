import { NextRequest } from 'next/server';
import { makeListenClient } from '@/lib/db/options';

export const runtime = 'nodejs'; // persistent PG connection requires Node runtime
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval> | null = null;
      const sql = makeListenClient();

      const safeEnqueue = (data: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(data));
        } catch {
          closed = true;
        }
      };

      /* Comment heartbeat every 25s: keeps proxies from killing the stream
         and lets the client detect dead connections. */
      heartbeat = setInterval(() => safeEnqueue(`: heartbeat\n\n`), 25_000);

      try {
        await sql.listen('db_changes', (payload) => {
          safeEnqueue(`data: ${payload}\n\n`);
        });
        safeEnqueue(`: connected\n\n`);
      } catch (err) {
        console.error('SSE listen failed:', err);
        safeEnqueue(`event: error\ndata: {"error":"listen failed"}\n\n`);
      }

      // Cleanup when client disconnects
      req.signal.addEventListener('abort', () => {
        closed = true;
        if (heartbeat) clearInterval(heartbeat);
        sql.end({ timeout: 5 }).catch(() => {});
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
