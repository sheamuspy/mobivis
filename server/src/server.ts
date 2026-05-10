import * as path from 'path';
import chokidar, { FSWatcher } from 'chokidar';
import { WebSocketServer, WebSocket } from 'ws';
import {
  ChangeEvent,
  computeDiff,
  readFileSafe,
  getLocalIP,
  isIgnoredPath,
  isTextFile,
} from './utils.js';

export const SERVER_VERSION = '1.0.0';

export interface ServerContext {
  wss: WebSocketServer;
  watcher: FSWatcher;
  broadcast: (data: unknown) => void;
  close: () => Promise<void>;
}

export interface FileEventContext {
  fileCache: Map<string, string>;
  broadcast: (data: unknown) => void;
  nextId: () => string;
  readFile?: (filePath: string) => string | null;
}

export function handleFileEvent(
  eventType: 'change' | 'add' | 'unlink',
  filePath: string,
  ctx: FileEventContext,
): void {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!isTextFile(ext)) return;

  const { fileCache, broadcast, nextId, readFile = readFileSafe } = ctx;
  const oldContent = fileCache.get(filePath) ?? '';
  let newContent = '';

  if (eventType !== 'unlink') {
    newContent = readFile(filePath) ?? '';
    fileCache.set(filePath, newContent);
  } else {
    fileCache.delete(filePath);
  }

  const { diff, linesAdded, linesRemoved } = computeDiff(oldContent, newContent);

  const event: ChangeEvent = {
    type: 'change',
    id: nextId(),
    timestamp: new Date().toISOString(),
    filePath,
    eventType,
    extension: ext,
    diff,
    linesAdded,
    linesRemoved,
  };

  broadcast(event);
}

export function createServer(opts: {
  port: number;
  watchDir: string;
  fileCache?: Map<string, string>;
}): ServerContext {
  const { port, watchDir } = opts;
  const fileCache = opts.fileCache ?? new Map<string, string>();
  let eventId = 0;
  const nextId = () => `evt-${++eventId}`;

  const wss = new WebSocketServer({ port });

  function broadcast(data: unknown): void {
    const message = JSON.stringify(data);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    }
  }

  wss.on('connection', (ws) => {
    ws.send(
      JSON.stringify({
        type: 'connected',
        watchDir,
        serverVersion: SERVER_VERSION,
      }),
    );

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type: string };
        void msg;
      } catch {
        // ignore malformed messages
      }
    });

    ws.on('error', (err) => {
      console.error('WebSocket client error:', err.message);
    });
  });

  wss.on('error', (err) => {
    console.error('WebSocket server error:', err.message);
  });

  const pingInterval = setInterval(() => {
    const ping = JSON.stringify({ type: 'ping' });
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(ping);
      }
    }
  }, 25_000);

  const watcher = chokidar.watch(watchDir, {
    ignored: (filePath: string) => isIgnoredPath(filePath, watchDir),
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  watcher
    .on('change', (p) => handleFileEvent('change', p, { fileCache, broadcast, nextId }))
    .on('add', (p) => handleFileEvent('add', p, { fileCache, broadcast, nextId }))
    .on('unlink', (p) => handleFileEvent('unlink', p, { fileCache, broadcast, nextId }))
    .on('error', (err) => console.error('Watcher error:', err));

  watcher.on('ready', () => {
    const ip = getLocalIP();
    const wsUrl = `ws://${ip}:${port}`;
    console.log('\n  ┌─────────────────────────────────────┐');
    console.log('  │         MobiVis Server ready         │');
    console.log('  ├─────────────────────────────────────┤');
    console.log(`  │  Watching  ${watchDir.slice(-26).padEnd(26)} │`);
    console.log(`  │  Local IP  ${ip.padEnd(26)} │`);
    console.log(`  │  WS URL    ${wsUrl.padEnd(26)} │`);
    console.log('  └─────────────────────────────────────┘');
    console.log('\n  Enter this URL in Expo Go → MobiVis:');
    console.log(`  ${wsUrl}\n`);
  });

  async function close(): Promise<void> {
    clearInterval(pingInterval);
    await watcher.close();
    return new Promise((resolve) => {
      wss.close(() => resolve());
    });
  }

  return { wss, watcher, broadcast, close };
}
