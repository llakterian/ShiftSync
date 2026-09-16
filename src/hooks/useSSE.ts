'use client';

import { useEffect, useState } from 'react';

type SSEPayload = {
  table: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
};

export function useSSE(callback?: (payload: SSEPayload) => void) {
  const [lastEvent, setLastEvent] = useState<SSEPayload | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const eventSource = new EventSource('/api/events');

    eventSource.onopen = () => setIsConnected(true);
    
    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as SSEPayload;
        setLastEvent(payload);
        if (callback) {
          callback(payload);
        }
      } catch (err) {
        console.error('Error parsing SSE data', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE connection error:', err);
      setIsConnected(false);
      eventSource.close();
      // Reconnection logic could go here, but EventSource usually auto-reconnects
    };

    return () => {
      eventSource.close();
    };
  }, [callback]);

  return { lastEvent, isConnected };
}
