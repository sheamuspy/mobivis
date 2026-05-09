import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import chokidar from 'chokidar';
import { diffLines } from 'diff';
import { WebSocketServer, WebSocket } from 'ws';

const SERVER_VERSION = '1.0.0';
const PORT = 4747;
const PING_INTERVAL_MS = 25_000;

const TEXT_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'go', 'rs', 'c', 'cpp', 'h', 'hpp',
  'java', 'kt', 'swift', 'rb', 'php', 'cs',
  'json', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'scss', 'sass', 'less',
  'md', 'mdx', 'txt', 'sh', 'bash', 'zsh', 'fish',
  'sql', 'graphql', 'gql', 'vue', 'svelte',
  'lock', 'prisma', 'proto', 'txt'
]);

const IGNORED = ['node_modules', '.git', 'dist', '.next', '.expo', 'coverage'];

const watchDir = path.resolve(process.argv[2] ?? process.cwd());
const fileCache = new Map<string, string>();
let eventId = 0;

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

interface ChangeEvent {
  type: 'change';
  id: string;
  timestamp: string;
  filePath: string;
  eventType: 'change' | 'add' | 'unlink';
  extension: string;
  diff: DiffLine[];
  linesAdded: number;
  linesRemoved: number;
}

function getLocalIP(): string {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

function computeDiff(
  oldContent: string,
  newContent: string,
): { diff: DiffLine[]; linesAdded: number; linesRemoved: number } {
  const changes = diffLines(oldContent, newContent);
  const result: DiffLine[] = [];
  let oldLine = 1;
  let newLine = 1;
  let linesAdded = 0;
  let linesRemoved = 0;

  for (const change of changes) {
    const lines = change.value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();

    for (const content of lines) {
      if (change.added) {
        result.push({ type: 'added', content, lineNumber: newLine++ });
        linesAdded++;
      } else if (change.removed) {
        result.push({ type: 'removed', content, lineNumber: oldLine++ });
        linesRemoved++;
      } else {
        result.push({ type: 'unchanged', content, lineNumber: newLine });
        oldLine++;
        newLine++;
      }
    }
  }

  return { diff: result, linesAdded, linesRemoved };
}

function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function broadcast(data: unknown): void {
  const message = JSON.stringify(data);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

const wss = new WebSocketServer({ port: PORT });

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
      // pong received — keepalive acknowledged, nothing to do
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
  process.exit(1);
});

setInterval(() => {
  const ping = JSON.stringify({ type: 'ping' });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(ping);
    }
  }
}, PING_INTERVAL_MS);

const watcher = chokidar.watch(watchDir, {
  ignored: (filePath: string) => {
    if (filePath === watchDir) return false;
    const rel = path.relative(watchDir, filePath);
    if (rel.startsWith('..')) return false;
    return rel.split(path.sep).some((seg) => IGNORED.includes(seg));
  },
  persistent: true,
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
});

function handleFileEvent(eventType: 'change' | 'add' | 'unlink', filePath: string): void {
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!TEXT_EXTENSIONS.has(ext)) return;

  const oldContent = fileCache.get(filePath) ?? '';
  let newContent = '';

  if (eventType !== 'unlink') {
    newContent = readFileSafe(filePath) ?? '';
    fileCache.set(filePath, newContent);
  } else {
    fileCache.delete(filePath);
  }

  const { diff, linesAdded, linesRemoved } = computeDiff(oldContent, newContent);

  const event: ChangeEvent = {
    type: 'change',
    id: `evt-${++eventId}`,
    timestamp: new Date().toISOString(),
    filePath,
    eventType,
    extension: ext,
    diff,
    linesAdded,
    linesRemoved,
  };

  broadcast(event);
  console.log(
    `  [${event.eventType.padEnd(6)}] ${path.relative(watchDir, filePath)}  +${linesAdded}/-${linesRemoved}`,
  );
}

watcher
  .on('change', (p) => handleFileEvent('change', p))
  .on('add', (p) => handleFileEvent('add', p))
  .on('unlink', (p) => handleFileEvent('unlink', p))
  .on('error', (err) => console.error('Watcher error:', err));

watcher.on('ready', () => {
  const ip = getLocalIP();
  const wsUrl = `ws://${ip}:${PORT}`;
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

process.on('SIGINT', () => {
  console.log('\n  Shutting down…');
  watcher.close().then(() => {
    wss.close(() => process.exit(0));
  });
});
