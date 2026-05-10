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
  it('computes correct diff for a single-line change', () => {
    const { diff, linesAdded, linesRemoved } = computeDiff('hello\n', 'world\n');
    expect(linesAdded).toBe(1);
    expect(linesRemoved).toBe(1);
    expect(diff).toContainEqual(expect.objectContaining({ type: 'removed', content: 'hello' }));
    expect(diff).toContainEqual(expect.objectContaining({ type: 'added', content: 'world' }));
  });

  it('counts multi-line additions correctly', () => {
    const { linesAdded, linesRemoved } = computeDiff('a\n', 'a\nb\nc\n');
    expect(linesAdded).toBe(2);
    expect(linesRemoved).toBe(0);
  });

  it('counts multi-line removals correctly', () => {
    const { linesAdded, linesRemoved } = computeDiff('a\nb\nc\n', 'a\n');
    expect(linesAdded).toBe(0);
    expect(linesRemoved).toBe(2);
  });

  it('handles empty diff (file touched but unchanged)', () => {
    const { diff, linesAdded, linesRemoved } = computeDiff('same\n', 'same\n');
    expect(linesAdded).toBe(0);
    expect(linesRemoved).toBe(0);
    expect(diff.every((l) => l.type === 'unchanged')).toBe(true);
  });

  it('handles adding content to an empty file', () => {
    const { diff, linesAdded, linesRemoved } = computeDiff('', 'new content\n');
    expect(linesAdded).toBe(1);
    expect(linesRemoved).toBe(0);
    expect(diff[0].type).toBe('added');
  });

  it('handles removing all content (empty result)', () => {
    const { linesAdded, linesRemoved } = computeDiff('old content\n', '');
    expect(linesAdded).toBe(0);
    expect(linesRemoved).toBe(1);
  });

  it('assigns correct line numbers to added lines', () => {
    const { diff } = computeDiff('a\n', 'a\nb\n');
    const added = diff.find((l) => l.type === 'added');
    expect(added?.lineNumber).toBe(2);
    expect(added?.content).toBe('b');
  });

  it('assigns correct line numbers to removed lines', () => {
    const { diff } = computeDiff('a\nb\n', 'a\n');
    const removed = diff.find((l) => l.type === 'removed');
    expect(removed?.lineNumber).toBe(2);
    expect(removed?.content).toBe('b');
  });

  it('returns unchanged lines with correct line numbers', () => {
    const { diff } = computeDiff('a\nb\n', 'a\nb\n');
    expect(diff[0]).toMatchObject({ type: 'unchanged', content: 'a', lineNumber: 1 });
    expect(diff[1]).toMatchObject({ type: 'unchanged', content: 'b', lineNumber: 2 });
  });

  it('aggregates totalAdded and totalRemoved correctly across multiple hunks', () => {
    const old = 'a\nb\nc\nd\ne\n';
    const next = 'A\nb\nc\nD\ne\n';
    const { linesAdded, linesRemoved } = computeDiff(old, next);
    expect(linesAdded).toBe(2);
    expect(linesRemoved).toBe(2);
  });

  it('produces a valid diff structure (each entry has type, content, lineNumber)', () => {
    const { diff } = computeDiff('x\ny\n', 'x\nz\n');
    for (const line of diff) {
      expect(line).toHaveProperty('type');
      expect(line).toHaveProperty('content');
      expect(line).toHaveProperty('lineNumber');
      expect(typeof line.lineNumber).toBe('number');
    }
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

  it('returns null when the file does not exist', () => {
    expect(readFileSafe('/nonexistent/path/file.ts')).toBeNull();
  });

  it('returns null when the path is a directory', () => {
    expect(readFileSafe(os.tmpdir())).toBeNull();
  });
});

// ─── getLocalIP ───────────────────────────────────────────────────────────────

function iface(
  address: string,
  opts: Partial<NetworkInterfaceInfo> = {},
): NetworkInterfaceInfo {
  return {
    family: 'IPv4',
    internal: false,
    netmask: '255.255.255.0',
    mac: '00:00:00:00:00:00',
    cidr: null,
    address,
    ...opts,
  } as NetworkInterfaceInfo;
}

describe('getLocalIP', () => {
  it('returns a non-loopback IPv4 address when one is available', () => {
    const mock = () => ({ eth0: [iface('192.168.1.100')] });
    expect(getLocalIP(mock)).toBe('192.168.1.100');
  });

  it('skips internal (loopback) interfaces and falls through to default', () => {
    const mock = () => ({ lo: [iface('127.0.0.1', { internal: true })] });
    expect(getLocalIP(mock)).toBe('127.0.0.1');
  });

  it('returns 127.0.0.1 when no interfaces are found', () => {
    expect(getLocalIP(() => ({}))).toBe('127.0.0.1');
  });

  it('skips IPv6 interfaces', () => {
    const mock = () => ({
      eth0: [iface('fe80::1', { family: 'IPv6' as unknown as 'IPv4' })],
    });
    expect(getLocalIP(mock)).toBe('127.0.0.1');
  });

  it('picks the first non-internal IPv4 address when multiple exist', () => {
    const mock = () => ({
      lo: [iface('127.0.0.1', { internal: true })],
      eth0: [iface('10.0.0.5')],
    });
    expect(getLocalIP(mock)).toBe('10.0.0.5');
  });
});

// ─── isTextFile ───────────────────────────────────────────────────────────────

describe('isTextFile', () => {
  it('returns true for TypeScript files', () => expect(isTextFile('ts')).toBe(true));
  it('returns true for JavaScript files', () => expect(isTextFile('js')).toBe(true));
  it('returns true for Python files', () => expect(isTextFile('py')).toBe(true));
  it('returns true for Markdown files', () => expect(isTextFile('md')).toBe(true));
  it('returns true for JSON files', () => expect(isTextFile('json')).toBe(true));
  it('returns true for YAML files', () => expect(isTextFile('yml')).toBe(true));
  it('returns true for shell scripts', () => expect(isTextFile('sh')).toBe(true));
  it('returns true for SQL files', () => expect(isTextFile('sql')).toBe(true));

  it('returns false for PNG images', () => expect(isTextFile('png')).toBe(false));
  it('returns false for JPEG images', () => expect(isTextFile('jpg')).toBe(false));
  it('returns false for executables', () => expect(isTextFile('exe')).toBe(false));
  it('returns false for WASM files', () => expect(isTextFile('wasm')).toBe(false));
  it('returns false for ZIP archives', () => expect(isTextFile('zip')).toBe(false));
  it('returns false for an empty extension', () => expect(isTextFile('')).toBe(false));
});

// ─── isIgnoredPath ────────────────────────────────────────────────────────────

describe('isIgnoredPath', () => {
  const watchDir = '/home/user/project';

  it('does not ignore the watchDir itself', () => {
    expect(isIgnoredPath(watchDir, watchDir)).toBe(false);
  });

  it('ignores paths inside node_modules', () => {
    expect(isIgnoredPath(`${watchDir}/node_modules/pkg/index.js`, watchDir)).toBe(true);
  });

  it('ignores paths inside .git', () => {
    expect(isIgnoredPath(`${watchDir}/.git/HEAD`, watchDir)).toBe(true);
  });

  it('ignores paths inside dist', () => {
    expect(isIgnoredPath(`${watchDir}/dist/bundle.js`, watchDir)).toBe(true);
  });

  it('ignores paths inside .next', () => {
    expect(isIgnoredPath(`${watchDir}/.next/cache`, watchDir)).toBe(true);
  });

  it('ignores paths inside coverage', () => {
    expect(isIgnoredPath(`${watchDir}/coverage/lcov.info`, watchDir)).toBe(true);
  });

  it('does not ignore regular source files', () => {
    expect(isIgnoredPath(`${watchDir}/src/index.ts`, watchDir)).toBe(false);
  });

  it('does not ignore nested source files', () => {
    expect(isIgnoredPath(`${watchDir}/src/components/Button.tsx`, watchDir)).toBe(false);
  });

  it('does not ignore paths that are outside the watchDir', () => {
    expect(isIgnoredPath('/home/user/other-project/node_modules', watchDir)).toBe(false);
  });
});
