'use client';

import { useEffect, useRef, useState } from 'react';

export type SSEPayload = {
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
};

/*
 * Subscribes to server-sent DB change events (/api/events).
 * The callback is stored in a ref so callers can pass inline lambdas
 * without resubscribing the EventSource on every render.
 */
export function useSSE(callback?: (payload: SSEPayload) => void) {
  const [lastEvent, setLastEvent] = useState<SSEPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retries = 0;
    let closed = false;

    const connect = () => {
      if (closed) return;
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        retries = 0;
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as SSEPayload;
          setLastEvent(payload);
          callbackRef.current?.(payload);
        } catch {
          console.error('Error parsing SSE data', event.data);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        /* EventSource auto-reconnects, but if the close came from the server
           (dev server restart, proxy timeout) reconnect manually with backoff. */
        if (!closed && retries < 5) {
          retries += 1;
          retryTimer = setTimeout(connect, 1000 * Math.min(retries, 10));
        }
      };
    };

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      eventSource?.close();
    };
  }, []);

  return { lastEvent, isConnected };
}
