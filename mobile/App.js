import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, PanResponder, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MonacoEditor from './src/components/MonacoEditor';
import FileTree from './src/components/FileTree';
import type { FileNode, EditorFile } from './src/types';

const SERVER_URL = 'ws://192.168.1.214:8080';
const MIN_SIDEBAR = 150;
const MAX_SIDEBAR = 350;

function getLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  const langs: Record<string, string> = {
    js: 'javascript', ts: 'typescript', tsx: 'typescript', jsx: 'javascript',
    json: 'json', html: 'html', css: 'css', scss: 'scss',
    md: 'markdown', txt: 'plaintext', py: 'python', rb: 'ruby',
    go: 'go', rs: 'rust', java: 'java', c: 'c', cpp: 'cpp',
    sh: 'shell', yaml: 'yaml', yml: 'yaml', xml: 'xml',
  };
  return langs[ext] || 'plaintext';
}

function ResizableSidebar({ children, width, setWidth, onWidthChange }) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newWidth = width + gestureState.dx;
        if (newWidth >= MIN_SIDEBAR && newWidth <= MAX_SIDEBAR) {
          setWidth(newWidth);
        }
      },
    })
  ).current;

  return (
    <View style={[styles.sidebar, { width }]}>
      {children}
      <View {...panResponder.panHandlers} style={styles.resizeHandle}>
        <View style={styles.resizeBar} />
      </View>
    </View>
  );
}

export default function App() {
  const [serverUrl, setServerUrl] = useState(SERVER_URL);
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [showSettings, setShowSettings] = useState(false);
  const wsRef = useRef(null);

  const connect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    
    const ws = new WebSocket(serverUrl);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        if (msg.type === 'tree' && msg.files) {
          const uniqueFiles = [];
          const seenPaths = new Set();
          msg.files.forEach(file => {
            if (!seenPaths.has(file.path)) {
              seenPaths.add(file.path);
              uniqueFiles.push(file);
            }
          });
          setFiles(uniqueFiles);
        } else if (msg.type === 'add' && !msg.isDirectory && msg.content !== undefined) {
          const editorFile = {
            path: msg.path,
            content: msg.content,
            language: getLanguage(msg.path),
          };
          setOpenFiles(prev => {
            if (!prev.find(f => f.path === msg.path)) {
              return [...prev, editorFile];
            }
            return prev;
          });
          setActiveFile(msg.path);
        }
      } catch {}
    };
  }, [serverUrl]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setConnected(false);
  }, []);

  const handleFileSelect = useCallback((file: FileNode) => {
    setActiveFile(file.path);
    if (!openFiles.find(f => f.path === file.path) && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'read', path: file.path }));
    }
  }, [openFiles]);

  const handleOpenFile = useCallback((path: string) => {
    setActiveFile(path);
    if (!openFiles.find(f => f.path === path) && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'read', path }));
    }
  }, [openFiles]);

  const handleCloseTab = useCallback((path: string) => {
    setOpenFiles(prev => prev.filter(f => f.path !== path));
    if (activeFile === path) {
      const remaining = openFiles.filter(f => f.path !== path);
      setActiveFile(remaining.length > 0 ? remaining[0].path : null);
    }
  }, [activeFile, openFiles]);

  const handleContentChange = useCallback((content: string) => {
    if (activeFile && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'write', path: activeFile, content }));
    }
  }, [activeFile]);

  const currentFile = openFiles.find(f => f.path === activeFile) || null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Mobivis</Text>
          <TouchableOpacity onPress={() => setShowSettings(true)} style={styles.settingsBtn}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.connectionRow}>
          <TextInput
            style={styles.input}
            value={serverUrl}
            onChangeText={setServerUrl}
            placeholder="Server URL"
            placeholderTextColor="#6b6b6b"
          />
          <TouchableOpacity
            style={[styles.button, connected ? styles.disconnectBtn : styles.connectBtn]}
            onPress={connected ? disconnect : connect}
          >
            <Text style={styles.buttonText}>
              {connected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {openFiles.length > 0 && (
        <View style={styles.tabBar}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
            <View style={styles.tabs}>
              {openFiles.map(file => (
                <View 
                  key={file.path} 
                  style={[
                    styles.tab,
                    activeFile === file.path && styles.tabActive
                  ]}
                >
                  <TouchableOpacity 
                    style={styles.tabContent}
                    onPress={() => handleOpenFile(file.path)}
                  >
                    <Text style={[
                      styles.tabName,
                      activeFile === file.path && styles.tabNameActive
                    ]}>
                      {file.path.split('/').pop()}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.tabClose}
                    onPress={() => handleCloseTab(file.path)}
                  >
                    <Text style={styles.tabCloseIcon}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      <View style={styles.main}>
        <ResizableSidebar width={sidebarWidth} setWidth={setSidebarWidth}>
          <FileTree
            files={files}
            selectedPath={activeFile}
            onFileSelect={handleFileSelect}
          />
        </ResizableSidebar>

        <View style={styles.editorArea}>
          {currentFile ? (
            <MonacoEditor
              file={currentFile}
              onContentChange={handleContentChange}
              onCursorChange={(line, col) => setCursorPos({ line, col })}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>📁</Text>
              <Text style={styles.emptyTitle}>No file open</Text>
              <Text style={styles.emptySubtitle}>Select a file from the explorer</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </Text>
          {currentFile && (
            <Text style={styles.statusText}>{currentFile.path}</Text>
          )}
        </View>
        <View style={styles.statusRight}>
          <Text style={styles.statusText}>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </Text>
          <Text style={styles.statusText}>
            {currentFile ? currentFile.language.toUpperCase() : ''}
          </Text>
        </View>
      </View>

      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.modalClose}>×</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={styles.settingsLabel}>Editor Settings</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsText}>Font Size</Text>
                <TextInput style={styles.settingsInput} defaultValue="14" keyboardType="numeric" />
              </View>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsText}>Tab Size</Text>
                <TextInput style={styles.settingsInput} defaultValue="2" keyboardType="numeric" />
              </View>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsText}>Word Wrap</Text>
                <Text style={styles.settingsToggle}>ON</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1e1e1e',
    paddingTop: 50,
  },
  header: { 
    backgroundColor: '#323233',
    padding: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  settingsBtn: { padding: 4 },
  settingsIcon: { fontSize: 20 },
  connectionRow: { flexDirection: 'row', gap: 8 },
  input: { 
    flex: 1, 
    backgroundColor: '#3c3c3c', 
    color: '#ffffff', 
    padding: 10, 
    borderRadius: 6,
    fontSize: 13,
  },
  button: { 
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 6,
    backgroundColor: '#094771',
  },
  connectBtn: { backgroundColor: '#22c55e' },
  disconnectBtn: { backgroundColor: '#ef4444' },
  buttonText: { 
    color: '#ffffff', 
    fontWeight: '600', 
    fontSize: 13 
  },
  tabBar: {
    backgroundColor: '#2d2d2d',
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  tabScroll: { flexGrow: 0 },
  tabs: { flexDirection: 'row', paddingHorizontal: 4 },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 1,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tabActive: {
    backgroundColor: '#1e1e1e',
  },
  tabContent: { marginRight: 4 },
  tabName: { color: '#6b6b6b', fontSize: 12 },
  tabNameActive: { color: '#ffffff' },
  tabClose: { padding: 2 },
  tabCloseIcon: { color: '#6b6b6b', fontSize: 16, fontWeight: 'bold' },
  main: { flex: 1, flexDirection: 'row' },
  sidebar: { 
    backgroundColor: '#252526',
    borderRightWidth: 1, 
    borderRightColor: '#1e1e1e',
    overflow: 'hidden',
  },
  resizeHandle: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resizeBar: {
    width: 4,
    height: 40,
    backgroundColor: '#3c3c3c',
    borderRadius: 2,
  },
  editorArea: { 
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { 
    color: '#6b6b6b', 
    fontSize: 18, 
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: { color: '#4b4b4b', fontSize: 14 },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#007acc',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  statusLeft: { flexDirection: 'row', gap: 16 },
  statusRight: { flexDirection: 'row', gap: 16 },
  statusText: { color: '#ffffff', fontSize: 12 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#2d2d2d',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  modalTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  modalClose: { color: '#6b6b6b', fontSize: 28, fontWeight: 'bold' },
  modalBody: { padding: 16 },
  settingsLabel: { 
    color: '#6b6b6b', 
    fontSize: 11, 
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  settingsText: { color: '#cccccc', fontSize: 15 },
  settingsInput: {
    backgroundColor: '#3c3c3c',
    color: '#ffffff',
    padding: 8,
    borderRadius: 4,
    width: 60,
    textAlign: 'center',
  },
  settingsToggle: { color: '#007acc', fontWeight: '600' },
});
