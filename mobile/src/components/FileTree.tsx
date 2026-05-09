import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { FileNode } from '../types';

interface FileTreeProps {
  files: FileNode[];
  selectedPath: string | null;
  onFileSelect: (file: FileNode) => void;
}

function getFileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const icons: Record<string, string> = {
    js: '📜', ts: '📜', tsx: '📜', jsx: '📜',
    json: '📋', html: '🌐', css: '🎨', scss: '🎨',
    md: '📝', txt: '📄', py: '🐍', rb: '💎',
    go: '🔵', rs: '🦀', java: '☕', c: '⚙️', cpp: '⚙️',
    sh: '💻', yaml: '📎', yml: '📎', xml: '📎',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️',
  };
  return icons[ext] || '📄';
}

export default function FileTree({ files, selectedPath, onFileSelect }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleFolder = useCallback((folderId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  }, []);

  const buildTree = useMemo(() => {
    const rootNodes: FileNode[] = [];
    const nodeMap = new Map<string, FileNode>();

    // First pass: index all nodes
    files.forEach(file => {
      nodeMap.set(file.path, { ...file, children: [] });
    });

    // Second pass: build tree structure
    files.forEach(file => {
      const node = nodeMap.get(file.path)!;
      if (file.parent === null) {
        rootNodes.push(node);
      } else {
        const parent = nodeMap.get(file.parent);
        if (parent) {
          parent.children = parent.children || [];
          if (!parent.children.find(c => c.path === node.path)) {
            parent.children.push(node);
          }
        } else {
          rootNodes.push(node);
        }
      }
    });

    // Sort: directories first, then alphabetically
    const sortNodes = (nodes: FileNode[]) => {
      nodes.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'tree' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      nodes.forEach(n => {
        if (n.children && n.children.length > 0) {
          sortNodes(n.children);
        }
      });
    };

    sortNodes(rootNodes);
    return rootNodes;
  }, [files]);

  const renderNode = (node: FileNode, level: number): React.ReactNode => {
    const isDirectory = node.type === 'tree';
    const children = node.children || [];
    const hasChildren = isDirectory && children.length > 0;
    const isExpanded = expanded.has(node.path);
    const isSelected = selectedPath === node.path;

    return (
      <View key={node.path}>
        <TouchableOpacity
          style={[
            styles.fileItem,
            { paddingLeft: 12 + level * 16 },
            isSelected && styles.fileItemSelected
          ]}
          onPress={() => {
            if (isDirectory) {
              toggleFolder(node.path);
            } else {
              onFileSelect(node);
            }
          }}
        >
          <Text style={styles.chevron}>
            {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
          </Text>
          <Text style={styles.icon}>
            {isDirectory ? (isExpanded ? '📂' : '📁') : getFileIcon(node.name)}
          </Text>
          <Text 
            style={[styles.fileName, isSelected && styles.fileNameSelected]} 
            numberOfLines={1}
          >
            {node.name}
          </Text>
        </TouchableOpacity>
        {isDirectory && isExpanded && children.length > 0 && (
          children.map(child => renderNode(child, level + 1))
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Explorer</Text>
      </View>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {buildTree.map(node => renderNode(node, 0))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  header: { 
    padding: 12, 
    borderBottomWidth: 1, 
    borderBottomColor: '#2d2d2d',
    backgroundColor: '#252526',
  },
  headerText: { 
    color: '#cccccc', 
    fontSize: 11, 
    fontWeight: 'bold', 
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollView: { flex: 1 },
  fileItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 6,
    paddingRight: 8,
  },
  fileItemSelected: { 
    backgroundColor: '#094771' 
  },
  chevron: { 
    color: '#6b6b6b', 
    fontSize: 10, 
    width: 16,
    textAlign: 'center',
  },
  icon: { fontSize: 14, marginRight: 6 },
  fileName: { 
    color: '#cccccc', 
    fontSize: 13, 
    flex: 1,
    marginRight: 8,
  },
  fileNameSelected: { color: '#ffffff' },
});
