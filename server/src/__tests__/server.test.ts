import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as net from 'net';
import * as os from 'os';
import { WebSocket } from 'ws';
import { handleFileEvent, createServer, SERVER_VERSION, ServerContext } from '../server.js';

afterEach(() => {
  vi.restoreAllMocks();
});

// ─── handleFileEvent ──────────────────────────────────────────────────────────

describe('handleFileEvent', () => {
  function makeCtx(initialCache?: Map<string, string>) {
    const fileCache = initialCache ?? new Map<string, string>();
    const broadcast = vi.fn();
    let id = 0;
    const nextId = () => `evt-${++id}`;
    return { fileCache, broadcast, nextId };
  }

  it('broadcasts a ChangeEvent when a text file changes', () => {
    const ctx = makeCtx(new Map([['/proj/src/foo.ts', 'old\n']]));
    const readFile = vi.fn().mockReturnValue('new\n');
    handleFileEvent('change', '/proj/src/foo.ts', { ...ctx, readFile });
    expect(ctx.broadcast).toHaveBeenCalledOnce();
    const event = ctx.broadcast.mock.calls[0][0];
    expect(event.type).toBe('change');
    expect(event.eventType).toBe('change');
    expect(event.extension).toBe('ts');
    expect(event.linesAdded).toBe(1);
    expect(event.linesRemoved).toBe(1);
  });

  it('skips binary files without broadcasting', () => {
    const ctx = makeCtx();
    const readFile = vi.fn();
    handleFileEvent('change', '/proj/image.png', { ...ctx, readFile });
    expect(ctx.broadcast).not.toHaveBeenCalled();
    expect(readFile).not.toHaveBeenCalled();
  });

  it('handles add event: populates cache and reports linesAdded', () => {
    const ctx = makeCtx();
    const readFile = vi.fn().mockReturnValue('brand new\n');
    handleFileEvent('add', '/proj/src/new.ts', { ...ctx, readFile });
    expect(ctx.broadcast).toHaveBeenCalledOnce();
    const event = ctx.broadcast.mock.calls[0][0];
    expect(event.eventType).toBe('add');
    expect(event.linesAdded).toBe(1);
    expect(event.linesRemoved).toBe(0);
    expect(ctx.fileCache.get('/proj/src/new.ts')).toBe('brand new\n');
  });

  it('handles unlink event: removes from cache and reports linesRemoved', () => {
    const ctx = makeCtx(new Map([['/proj/src/old.ts', 'gone\n']]));
    handleFileEvent('unlink', '/proj/src/old.ts', ctx);
    expect(ctx.broadcast).toHaveBeenCalledOnce();
    const event = ctx.broadcast.mock.calls[0][0];
    expect(event.eventType).toBe('unlink');
    expect(event.linesRemoved).toBe(1);
    expect(event.linesAdded).toBe(0);
    expect(ctx.fileCache.has('/proj/src/old.ts')).toBe(false);
  });

  it('treats missing cache entry as empty string (first-seen file)', () => {
    const ctx = makeCtx();
    const readFile = vi.fn().mockReturnValue('first line\n');
    handleFileEvent('add', '/proj/src/brand-new.py', { ...ctx, readFile });
    const event = ctx.broadcast.mock.calls[0][0];
    expect(event.linesAdded).toBe(1);
    expect(event.linesRemoved).toBe(0);
  });

  it('assigns sequential IDs via nextId', () => {
    const ctx = makeCtx();
    const readFile = vi.fn().mockReturnValue('a\n');
    handleFileEvent('add', '/proj/a.ts', { ...ctx, readFile });
    handleFileEvent('add', '/proj/b.ts', { ...ctx, readFile });
    const ids = ctx.broadcast.mock.calls.map((c) => c[0].id as string);
    expect(ids[0]).toBe('evt-1');
    expect(ids[1]).toBe('evt-2');
  });

  it('ChangeEvent includes a valid ISO timestamp', () => {
    const ctx = makeCtx();
    const readFile = vi.fn().mockReturnValue('x\n');
    handleFileEvent('add', '/proj/src/x.ts', { ...ctx, readFile });
    const ts = ctx.broadcast.mock.calls[0][0].timestamp as string;
    expect(new Date(ts).toISOString()).toBe(ts);
  });

  it('updates fileCache with new content on change', () => {
    const ctx = makeCtx(new Map([['/proj/src/mod.ts', 'v1\n']]));
    const readFile = vi.fn().mockReturnValue('v2\n');
    handleFileEvent('change', '/proj/src/mod.ts', { ...ctx, readFile });
    expect(ctx.fileCache.get('/proj/src/mod.ts')).toBe('v2\n');
  });

  it('handles readFile returning null (treats as empty content)', () => {
    const ctx = makeCtx();
    const readFile = vi.fn().mockReturnValue(null);
    handleFileEvent('add', '/proj/src/unreadable.ts', { ...ctx, readFile });
    expect(ctx.broadcast).toHaveBeenCalledOnce();
    const event = ctx.broadcast.mock.calls[0][0];
    expect(event.linesAdded).toBe(0);
    expect(event.linesRemoved).toBe(0);
  });
});

// ─── WebSocket layer helpers ───────────────────────────────────────────────────

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address() as net.AddressInfo;
      srv.close(() => resolve(addr.port));
    });
    srv.on('error', reject);
  });
}

interface WsSession {
  ws: WebSocket;
  receive: () => Promise<unknown>;
  close: () => void;
  terminate: () => void;
}

/** Connect and buffer all incoming messages so none are ever missed. */
function wsConnect(port: number): Promise<WsSession> {
  return new Promise((resolve, reject) => {
    const queue: unknown[] = [];
    const waiters: Array<(v: unknown) => void> = [];

    const ws = new WebSocket(`ws://127.0.0.1:${port}`);

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (waiters.length > 0) {
          waiters.shift()!(msg);
        } else {
          queue.push(msg);
        }
      } catch {
        // ignore parse errors in helpers
      }
    });

    ws.once('open', () =>
      resolve({
        ws,
        receive: () => {
          if (queue.length > 0) return Promise.resolve(queue.shift()!);
          return new Promise((res) => waiters.push(res));
        },
        close: () => ws.close(),
        terminate: () => ws.terminate(),
      }),
    );
    ws.once('error', reject);
  });
}

// ─── createServer / WebSocket layer ──────────────────────────────────────────

describe('createServer / WebSocket layer', () => {
  let server: ServerContext;
  let port: number;

  beforeEach(async () => {
    port = await freePort();
    server = createServer({ port, watchDir: os.tmpdir() });
    await new Promise<void>((resolve) => {
      if (server.wss.address()) return resolve();
      server.wss.once('listening', resolve);
    });
  }, 15_000);

  afterEach(async () => {
    await server.close();
  }, 15_000);

  it('sends a "connected" message to a new client with serverVersion', async () => {
    const client = await wsConnect(port);
    const msg = await client.receive();
    client.close();
    expect(msg).toMatchObject({ type: 'connected', serverVersion: SERVER_VERSION });
  });

  it('connected message includes the watchDir', async () => {
    const client = await wsConnect(port);
    const msg = (await client.receive()) as Record<string, unknown>;
    client.close();
    expect(msg.watchDir).toBe(os.tmpdir());
  });

  it('broadcasts a message to all connected clients', async () => {
    const c1 = await wsConnect(port);
    const c2 = await wsConnect(port);
    // consume 'connected' messages
    await c1.receive();
    await c2.receive();

    server.broadcast({ type: 'test-broadcast', value: 99 });

    const [m1, m2] = await Promise.all([c1.receive(), c2.receive()]);
    c1.close();
    c2.close();
    expect(m1).toMatchObject({ type: 'test-broadcast', value: 99 });
    expect(m2).toMatchObject({ type: 'test-broadcast', value: 99 });
  });

  it('does not throw when a client disconnects before a broadcast', async () => {
    const client = await wsConnect(port);
    await client.receive(); // consume 'connected'
    client.terminate(); // abrupt close
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    expect(() => server.broadcast({ type: 'after-disconnect' })).not.toThrow();
  });

  it('messages are valid JSON with a string "type" field', async () => {
    const client = await wsConnect(port);
    const msg = (await client.receive()) as Record<string, unknown>;
    client.close();
    expect(typeof msg.type).toBe('string');
  });

  it('ignores malformed messages from clients without crashing', async () => {
    const client = await wsConnect(port);
    await client.receive(); // consume 'connected'
    client.ws.send('not json at all {{{');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(server.wss.clients.size).toBeGreaterThan(0);
    client.close();
  });
});
