export interface FileNode {
  id: string;
  name: string;
  type: 'blob' | 'tree';
  path: string;
  parent: string | null;
  children?: FileNode[];
}

export interface EditorFile {
  path: string;
  content: string;
  language: string;
}

export interface WebSocketMessage {
  type: 'add' | 'change' | 'delete';
  path: string;
  content?: string;
  isDirectory?: boolean;
}
