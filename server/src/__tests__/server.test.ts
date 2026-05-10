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

  it('skips binary files without broadcasting', () => {
    const ctx = makeCtx();
    handleFileEvent('change', '/proj/image.png', { ...ctx, readFile: vi.fn() });
    expect(ctx.broadcast).not.toHaveBeenCalled();
  });

  it.each([
    {
      eventType: 'change' as const,
      filePath: '/proj/src/foo.ts',
      initialContent: 'old\n',
      newContent: 'new\n',
      expectedAdded: 1,
      expectedRemoved: 1,
    },
    {
      eventType: 'add' as const,
      filePath: '/proj/src/new.ts',
      initialContent: undefined,
      newContent: 'brand new\n',
      expectedAdded: 1,
      expectedRemoved: 0,
    },
  ])('$eventType event broadcasts correct ChangeEvent', ({ eventType, filePath, initialContent, newContent, expectedAdded, expectedRemoved }) => {
    const cache = initialContent ? new Map([[filePath, initialContent]]) : undefined;
    const ctx = makeCtx(cache);
    const readFile = vi.fn().mockReturnValue(newContent);

    handleFileEvent(eventType, filePath, { ...ctx, readFile });

    expect(ctx.broadcast).toHaveBeenCalledOnce();
    const event = ctx.broadcast.mock.calls[0][0];
    expect(event).toMatchObject({ type: 'change', eventType, extension: 'ts' });
    expect(event.linesAdded).toBe(expectedAdded);
    expect(event.linesRemoved).toBe(expectedRemoved);
  });

  it('unlink removes entry from cache and reports lines removed', () => {
    const ctx = makeCtx(new Map([['/proj/src/old.ts', 'gone\n']]));
    handleFileEvent('unlink', '/proj/src/old.ts', ctx);
    const event = ctx.broadcast.mock.calls[0][0];
    expect(event.eventType).toBe('unlink');
    expect(event.linesRemoved).toBe(1);
    expect(event.linesAdded).toBe(0);
    expect(ctx.fileCache.has('/proj/src/old.ts')).toBe(false);
  });

  it('treats a null readFile result as empty content without throwing', () => {
    const ctx = makeCtx();
    handleFileEvent('add', '/proj/src/unreadable.ts', { ...ctx, readFile: vi.fn().mockReturnValue(null) });
    expect(ctx.broadcast).toHaveBeenCalledOnce();
    const event = ctx.broadcast.mock.calls[0][0];
    expect(event.linesAdded).toBe(0);
    expect(event.linesRemoved).toBe(0);
  });
});

// ─── createServer / WebSocket layer ──────────────────────────────────────────

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
        if (waiters.length > 0) waiters.shift()!(msg);
        else queue.push(msg);
      } catch { /* ignore parse errors */ }
    });
    ws.once('open', () =>
      resolve({
        ws,
        receive: () =>
          queue.length > 0
            ? Promise.resolve(queue.shift()!)
            : new Promise((res) => waiters.push(res)),
        close: () => ws.close(),
        terminate: () => ws.terminate(),
      }),
    );
    ws.once('error', reject);
  });
}

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

  it('sends a connected message with serverVersion and watchDir on connect', async () => {
    const client = await wsConnect(port);
    const msg = (await client.receive()) as Record<string, unknown>;
    client.close();
    expect(msg).toMatchObject({ type: 'connected', serverVersion: SERVER_VERSION, watchDir: os.tmpdir() });
  });

  it('broadcasts to all connected clients', async () => {
    const [c1, c2] = await Promise.all([wsConnect(port), wsConnect(port)]);
    await c1.receive(); // consume 'connected'
    await c2.receive();

    server.broadcast({ type: 'test', value: 42 });
    const [m1, m2] = await Promise.all([c1.receive(), c2.receive()]);
    c1.close();
    c2.close();

    expect(m1).toMatchObject({ type: 'test', value: 42 });
    expect(m2).toMatchObject({ type: 'test', value: 42 });
  });

  it('does not throw when a client disconnects before a broadcast', async () => {
    const client = await wsConnect(port);
    await client.receive();
    client.terminate();
    await new Promise<void>((resolve) => setTimeout(resolve, 80));
    expect(() => server.broadcast({ type: 'after-disconnect' })).not.toThrow();
  });

  it('ignores malformed JSON from clients without crashing', async () => {
    const client = await wsConnect(port);
    await client.receive();
    client.ws.send('not json {{{');
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    expect(server.wss.clients.size).toBeGreaterThan(0);
    client.close();
  });
});
