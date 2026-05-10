import { describe, it, expect } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import type { NetworkInterfaceInfo } from 'os';
import {
  computeDiff,
  readFileSafe,
  getLocalIP,
  isTextFile,
  isIgnoredPath,
} from '../utils.js';

// ─── computeDiff ──────────────────────────────────────────────────────────────

describe('computeDiff', () => {
  it('builds diff entries with correct type, content and line numbers', () => {
    const { diff, linesAdded, linesRemoved } = computeDiff('hello\n', 'world\n');
    expect(linesAdded).toBe(1);
    expect(linesRemoved).toBe(1);
    expect(diff).toContainEqual(expect.objectContaining({ type: 'removed', content: 'hello', lineNumber: 1 }));
    expect(diff).toContainEqual(expect.objectContaining({ type: 'added', content: 'world', lineNumber: 1 }));
  });

  it.each([
    { label: 'unchanged file',       old: 'same\n',              next: 'same\n',              added: 0, removed: 0 },
    { label: 'lines appended',       old: 'a\n',                 next: 'a\nb\nc\n',           added: 2, removed: 0 },
    { label: 'lines removed',        old: 'a\nb\nc\n',           next: 'a\n',                 added: 0, removed: 2 },
    { label: 'content added to empty', old: '',                   next: 'new\n',               added: 1, removed: 0 },
    { label: 'all content removed',  old: 'gone\n',              next: '',                    added: 0, removed: 1 },
    { label: 'changes in two hunks', old: 'a\nb\nc\nd\ne\n',     next: 'A\nb\nc\nD\ne\n',    added: 2, removed: 2 },
  ])('$label → +$added/-$removed', ({ old, next, added, removed }) => {
    const result = computeDiff(old, next);
    expect(result.linesAdded).toBe(added);
    expect(result.linesRemoved).toBe(removed);
  });

  it('preserves sequential line numbers for unchanged context', () => {
    const { diff } = computeDiff('a\nb\n', 'a\nb\n');
    expect(diff[0]).toMatchObject({ type: 'unchanged', content: 'a', lineNumber: 1 });
    expect(diff[1]).toMatchObject({ type: 'unchanged', content: 'b', lineNumber: 2 });
  });
});

// ─── readFileSafe ─────────────────────────────────────────────────────────────

describe('readFileSafe', () => {
  it('returns file content when the file exists', () => {
    const tmpFile = path.join(os.tmpdir(), `mobivis-test-${Date.now()}.txt`);
    fs.writeFileSync(tmpFile, 'hello from file');
    try {
      expect(readFileSafe(tmpFile)).toBe('hello from file');
    } finally {
      fs.unlinkSync(tmpFile);
    }
  });

  it('returns null when the path does not exist', () => {
    expect(readFileSafe('/nonexistent/path/file.ts')).toBeNull();
  });
});

// ─── getLocalIP ───────────────────────────────────────────────────────────────

function iface(address: string, opts: Partial<NetworkInterfaceInfo> = {}): NetworkInterfaceInfo {
  return { family: 'IPv4', internal: false, netmask: '255.255.255.0', mac: '00:00:00:00:00:00', cidr: null, address, ...opts } as NetworkInterfaceInfo;
}

describe('getLocalIP', () => {
  it('returns the first non-internal IPv4 address', () => {
    const mock = () => ({ lo: [iface('127.0.0.1', { internal: true })], eth0: [iface('10.0.0.5')] });
    expect(getLocalIP(mock)).toBe('10.0.0.5');
  });

  it.each([
    ['no interfaces',   () => ({})],
    ['only loopback',   () => ({ lo: [iface('127.0.0.1', { internal: true })] })],
    ['only IPv6',       () => ({ eth0: [iface('fe80::1', { family: 'IPv6' as unknown as 'IPv4' })] })],
  ] as const)('falls back to 127.0.0.1 when %s', (_, mock) => {
    expect(getLocalIP(mock)).toBe('127.0.0.1');
  });
});

// ─── isTextFile ───────────────────────────────────────────────────────────────

describe('isTextFile', () => {
  it.each(['ts', 'tsx', 'js', 'py', 'md', 'json', 'yml', 'sh', 'sql', 'go', 'rs'])(
    'returns true for .%s',
    (ext) => expect(isTextFile(ext)).toBe(true),
  );

  it.each(['png', 'jpg', 'exe', 'wasm', 'zip', ''])(
    'returns false for .%s (binary/unknown)',
    (ext) => expect(isTextFile(ext)).toBe(false),
  );
});

// ─── isIgnoredPath ────────────────────────────────────────────────────────────

describe('isIgnoredPath', () => {
  const wd = '/home/user/project';

  it('never ignores the watchDir root itself', () => {
    expect(isIgnoredPath(wd, wd)).toBe(false);
  });

  it('never ignores paths outside the watchDir', () => {
    expect(isIgnoredPath('/home/user/other/node_modules', wd)).toBe(false);
  });

  it.each(['node_modules', '.git', 'dist', '.next', '.expo', 'coverage'])(
    'ignores paths inside %s',
    (dir) => expect(isIgnoredPath(`${wd}/${dir}/file.ts`, wd)).toBe(true),
  );

  it.each([`${wd}/src/index.ts`, `${wd}/src/components/Button.tsx`])(
    'does not ignore source file %s',
    (filePath) => expect(isIgnoredPath(filePath, wd)).toBe(false),
  );
});
