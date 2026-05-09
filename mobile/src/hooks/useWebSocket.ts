import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChangeEvent, ServerMessage } from '../types';

export type WsStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseWebSocketReturn {
  status: WsStatus;
  events: ChangeEvent[];
  watchDir: string | null;
  connect: (url: string) => void;
  disconnect: () => void;
}

export function useWebSocket(): UseWebSocketReturn {
  const [status, setStatus] = useState<WsStatus>('idle');
  const [events, setEvents] = useState<ChangeEvent[]>([]);
  const [watchDir, setWatchDir] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('disconnected');
  }, []);

  const connect = useCallback((url: string) => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus('connecting');
    setEvents([]);
    setWatchDir(null);

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => setStatus('connected');

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data as string) as ServerMessage;
        if (msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        } else if (msg.type === 'connected') {
          setWatchDir(msg.watchDir);
        } else if (msg.type === 'change') {
          setEvents((prev) => [msg, ...prev].slice(0, 50));
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onerror = () => setStatus('error');

    ws.onclose = () => setStatus('disconnected');
  }, []);

  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  return { status, events, watchDir, connect, disconnect };
}
