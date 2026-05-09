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

export interface ConnectedMessage {
  type: 'connected';
  watchDir: string;
  serverVersion: string;
}

export interface PingMessage {
  type: 'ping';
}

export type ServerMessage = ChangeEvent | ConnectedMessage | PingMessage;
