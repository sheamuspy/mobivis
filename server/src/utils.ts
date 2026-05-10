import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { diffLines } from 'diff';

export const TEXT_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'go', 'rs', 'c', 'cpp', 'h', 'hpp',
  'java', 'kt', 'swift', 'rb', 'php', 'cs',
  'json', 'yaml', 'yml', 'toml', 'xml', 'html', 'css', 'scss', 'sass', 'less',
  'md', 'mdx', 'txt', 'sh', 'bash', 'zsh', 'fish',
  'sql', 'graphql', 'gql', 'vue', 'svelte',
  'lock', 'prisma', 'proto',
]);

export const IGNORED = ['node_modules', '.git', 'dist', '.next', '.expo', 'coverage'];

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  content: string;
  lineNumber: number;
}

export interface ChangeEvent {
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

export function getLocalIP(
  getInterfaces: () => NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces,
): string {
  for (const ifaces of Object.values(getInterfaces())) {
    for (const iface of ifaces ?? []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

export function computeDiff(
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

export function readFileSafe(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

export function isTextFile(ext: string): boolean {
  return TEXT_EXTENSIONS.has(ext);
}

export function isIgnoredPath(filePath: string, watchDir: string): boolean {
  if (filePath === watchDir) return false;
  const rel = path.relative(watchDir, filePath);
  if (rel.startsWith('..')) return false;
  return rel.split(path.sep).some((seg) => IGNORED.includes(seg));
}
