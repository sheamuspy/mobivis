import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, TextInput, Dimensions, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MonacoEditor from './src/components/MonacoEditor';
import FileTree from './src/components/FileTree';
import type { FileNode, EditorFile } from './src/types';

const SERVER_URL = 'ws://192.168.1.214:8080';

const THEMES = [
  { id: 'vs-dark', name: 'VS Code Dark', preview: '#1e1e1e' },
  { id: 'hc-black', name: 'High Contrast', preview: '#000000' },
  { id: 'hc-light', name: 'High Contrast Light', preview: '#ffffff' },
  { id: 'vs', name: 'VS Code Light', preview: '#ffffff' },
];

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

export default function App() {
  const [serverUrl, setServerUrl] = useState(SERVER_URL);
  const [connected, setConnected] = useState(false);
  const [files, setFiles] = useState([]);
  const [openFiles, setOpenFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [showSettings, setShowSettings] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const wsRef = useRef(null);

  // Settings state
  const [settings, setSettings] = useState({
    fontSize: 14,
    tabSize: 2,
    wordWrap: true,
    theme: 'vs-dark',
    minimap: false,
    lineNumbers: true,
    autoSave: false,
    formatOnPaste: false,
  });

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
    setShowSidebar(false);
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
      setActiveItem(remaining.length > 0 ? remaining[0].path : null);
    }
  }, [activeFile, openFiles]);

  const handleContentChange = useCallback((content: string) => {
    if (activeFile && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'write', path: activeFile, content }));
    }
  }, [activeFile]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const currentFile = openFiles.find(f => f.path === activeFile) || null;

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity 
            style={styles.hamburgerBtn}
            onPress={() => setShowSidebar(!showSidebar)}
          >
            <Text style={styles.hamburgerIcon}>☰</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Mobivis</Text>
          {currentFile && (
            <TouchableOpacity 
              style={styles.breadcrumb}
              onPress={() => setShowSidebar(true)}
            >
              <Text style={styles.breadcrumbText} numberOfLines={1}>
                {currentFile.path}
              </Text>
              <Text style={styles.breadcrumbIcon}>▾</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity 
            style={styles.iconBtn}
            onPress={() => setShowSettings(true)}
          >
            <Text style={styles.iconText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.connectBtn, connected && styles.connectedBtn]}
            onPress={connected ? disconnect : connect}
          >
            <Text style={styles.connectText}>
              {connected ? 'Disconnect' : 'Connect'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tab Bar */}
      {openFiles.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar}>
          <View style={styles.tabs}>
            {openFiles.map(file => (
              <TouchableOpacity
                key={file.path}
                style={[styles.tab, activeFile === file.path && styles.tabActive]}
                onPress={() => handleOpenFile(file.path)}
              >
                <Text style={[styles.tabName, activeFile === file.path && styles.tabNameActive]}>
                  {file.path.split('/').pop()}
                </Text>
                <TouchableOpacity 
                  style={styles.tabClose}
                  onPress={() => handleCloseTab(file.path)}
                >
                  <Text style={styles.tabCloseIcon}>×</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Server URL */}
      <View style={styles.urlBar}>
        <TextInput
          style={styles.urlInput}
          value={serverUrl}
          onChangeText={setServerUrl}
          placeholder="ws://192.168.1.100:8080"
          placeholderTextColor="#6b6b6b"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {/* Main Editor Area */}
      <View style={styles.editorArea}>
        {currentFile ? (
          <MonacoEditor
            file={currentFile}
            theme={settings.theme}
            fontSize={settings.fontSize}
            tabSize={settings.tabSize}
            wordWrap={settings.wordWrap}
            lineNumbers={settings.lineNumbers}
            minimap={settings.minimap}
            onContentChange={handleContentChange}
            onCursorChange={(line, col) => setCursorPos({ line, col })}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>📁</Text>
            <Text style={styles.emptyTitle}>No file open</Text>
            <Text style={styles.emptyHint}>Tap ☰ to browse files</Text>
          </View>
        )}
      </View>

      {/* Status Bar */}
      <View style={styles.statusBar}>
        <View style={styles.statusLeft}>
          <Text style={styles.statusText}>
            {connected ? '● Connected' : '○ Disconnected'}
          </Text>
        </View>
        <View style={styles.statusRight}>
          <Text style={styles.statusText}>
            Ln {cursorPos.line}, Col {cursorPos.col}
          </Text>
          {currentFile && (
            <Text style={styles.statusText}>{currentFile.language.toUpperCase()}</Text>
          )}
        </View>
      </View>

      {/* File Tree Sidebar (Drawer) */}
      <Modal 
        visible={showSidebar} 
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowSidebar(false)}
      >
        <View style={styles.sidebarOverlay}>
          <TouchableOpacity 
            style={styles.sidebarBackdrop}
            onPress={() => setShowSidebar(false)}
          />
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Files</Text>
              <TouchableOpacity onPress={() => setShowSidebar(false)}>
                <Text style={styles.sidebarClose}>×</Text>
              </TouchableOpacity>
            </View>
            <FileTree
              files={files}
              selectedPath={activeFile}
              onFileSelect={handleFileSelect}
            />
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettings} animationType="slide" transparent>
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsContent}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.settingsClose}>✓</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.settingsBody}>
              
              {/* Theme Section */}
              <Text style={styles.settingsSection}>Appearance</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Theme</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.themeOptions}>
                    {THEMES.map(theme => (
                      <TouchableOpacity
                        key={theme.id}
                        style={[
                          styles.themeOption,
                          { backgroundColor: theme.preview },
                          settings.theme === theme.id && styles.themeOptionSelected
                        ]}
                        onPress={() => updateSetting('theme', theme.id)}
                      >
                        {settings.theme === theme.id && (
                          <Text style={styles.themeCheck}>✓</Text>
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Font Section */}
              <Text style={styles.settingsSection}>Editor</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Font Size</Text>
                <View style={styles.numberInput}>
                  <TouchableOpacity 
                    style={styles.numberBtn}
                    onPress={() => updateSetting('fontSize', Math.max(10, settings.fontSize - 1))}
                  >
                    <Text style={styles.numberBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{settings.fontSize}</Text>
                  <TouchableOpacity 
                    style={styles.numberBtn}
                    onPress={() => updateSetting('fontSize', Math.min(24, settings.fontSize + 1))}
                  >
                    <Text style={styles.numberBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Tab Size</Text>
                <View style={styles.numberInput}>
                  <TouchableOpacity 
                    style={styles.numberBtn}
                    onPress={() => updateSetting('tabSize', Math.max(2, settings.tabSize - 1))}
                  >
                    <Text style={styles.numberBtnText}>−</Text>
                  </TouchableOpacity>
                  <Text style={styles.numberValue}>{settings.tabSize}</Text>
                  <TouchableOpacity 
                    style={styles.numberBtn}
                    onPress={() => updateSetting('tabSize', Math.min(8, settings.tabSize + 1))}
                  >
                    <Text style={styles.numberBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Word Wrap</Text>
                <TouchableOpacity 
                  style={[styles.toggle, settings.wordWrap && styles.toggleOn]}
                  onPress={() => updateSetting('wordWrap', !settings.wordWrap)}
                >
                  <Text style={[styles.toggleText, settings.wordWrap && styles.toggleTextOn]}>
                    {settings.wordWrap ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Line Numbers</Text>
                <TouchableOpacity 
                  style={[styles.toggle, settings.lineNumbers && styles.toggleOn]}
                  onPress={() => updateSetting('lineNumbers', !settings.lineNumbers)}
                >
                  <Text style={[styles.toggleText, settings.lineNumbers && styles.toggleTextOn]}>
                    {settings.lineNumbers ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Minimap</Text>
                <TouchableOpacity 
                  style={[styles.toggle, settings.minimap && styles.toggleOn]}
                  onPress={() => updateSetting('minimap', !settings.minimap)}
                >
                  <Text style={[styles.toggleText, settings.minimap && styles.toggleTextOn]}>
                    {settings.minimap ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Auto-save Section */}
              <Text style={styles.settingsSection}>Behavior</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Auto Save</Text>
                <TouchableOpacity 
                  style={[styles.toggle, settings.autoSave && styles.toggleOn]}
                  onPress={() => updateSetting('autoSave', !settings.autoSave)}
                >
                  <Text style={[styles.toggleText, settings.autoSave && styles.toggleTextOn]}>
                    {settings.autoSave ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Format on Paste</Text>
                <TouchableOpacity 
                  style={[styles.toggle, settings.formatOnPaste && styles.toggleOn]}
                  onPress={() => updateSetting('formatOnPaste', !settings.formatOnPaste)}
                >
                  <Text style={[styles.toggleText, settings.formatOnPaste && styles.toggleTextOn]}>
                    {settings.formatOnPaste ? 'ON' : 'OFF'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* About Section */}
              <Text style={styles.settingsSection}>About</Text>
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>Version</Text>
                <Text style={styles.settingsValue}>1.0.0</Text>
              </View>

              <View style={styles.bottomPadding} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#1e1e1e',
    paddingTop: 50,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#323233',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  topBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  hamburgerBtn: {
    padding: 8,
    marginRight: 8,
  },
  hamburgerIcon: {
    color: '#ffffff',
    fontSize: 24,
  },
  title: { 
    color: '#ffffff', 
    fontSize: 18, 
    fontWeight: 'bold',
    marginRight: 8,
  },
  breadcrumb: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3c3c3c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    maxWidth: '60%',
  },
  breadcrumbText: {
    color: '#cccccc',
    fontSize: 12,
    flexShrink: 1,
  },
  breadcrumbIcon: {
    color: '#6b6b6b',
    fontSize: 10,
    marginLeft: 4,
  },
  iconBtn: {
    padding: 8,
  },
  iconText: { fontSize: 20 },
  connectBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  connectedBtn: {
    backgroundColor: '#ef4444',
  },
  connectText: { 
    color: '#ffffff', 
    fontWeight: '600', 
    fontSize: 12 
  },
  tabBar: {
    backgroundColor: '#252526',
    maxHeight: 44,
  },
  tabs: { 
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2d2d2d',
    paddingLeft: 12,
    paddingRight: 4,
    paddingVertical: 8,
    marginRight: 2,
    borderRadius: 4,
    maxWidth: 150,
  },
  tabActive: {
    backgroundColor: '#1e1e1e',
  },
  tabName: { 
    color: '#6b6b6b', 
    fontSize: 12,
    maxWidth: 100,
  },
  tabNameActive: { color: '#ffffff' },
  tabClose: { padding: 4 },
  tabCloseIcon: { 
    color: '#6b6b6b', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  urlBar: {
    backgroundColor: '#252526',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  urlInput: { 
    backgroundColor: '#3c3c3c', 
    color: '#ffffff', 
    padding: 10, 
    borderRadius: 6,
    fontSize: 13,
  },
  editorArea: { 
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { 
    color: '#6b6b6b', 
    fontSize: 18, 
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyHint: { color: '#4b4b4b', fontSize: 14 },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#007acc',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  statusLeft: { flexDirection: 'row' },
  statusRight: { flexDirection: 'row', gap: 16 },
  statusText: { color: '#ffffff', fontSize: 12 },
  sidebarOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  sidebarBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sidebar: {
    width: SCREEN_WIDTH * 0.75,
    maxWidth: 300,
    backgroundColor: '#252526',
    borderRightWidth: 1,
    borderRightColor: '#1e1e1e',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e1e',
  },
  sidebarTitle: {
    color: '#cccccc',
    fontSize: 14,
    fontWeight: 'bold',
  },
  sidebarClose: {
    color: '#6b6b6b',
    fontSize: 24,
    fontWeight: 'bold',
  },
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  settingsContent: {
    backgroundColor: '#2d2d2d',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
    maxHeight: '80%',
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  settingsTitle: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  settingsClose: { color: '#22c55e', fontSize: 24, fontWeight: 'bold' },
  settingsBody: { padding: 16 },
  settingsSection: { 
    color: '#6b6b6b', 
    fontSize: 11, 
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#3c3c3c',
  },
  settingsLabel: { color: '#cccccc', fontSize: 15 },
  settingsValue: { color: '#6b6b6b', fontSize: 15 },
  themeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  themeOption: {
    width: 36,
    height: 36,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3c3c3c',
    justifyContent: 'center',
    alignItems: 'center',
  },
  themeOptionSelected: {
    borderColor: '#007acc',
  },
  themeCheck: { color: '#007acc', fontWeight: 'bold' },
  numberInput: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  numberBtn: {
    backgroundColor: '#3c3c3c',
    width: 32,
    height: 32,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  numberBtnText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold' },
  numberValue: { color: '#ffffff', fontSize: 15, width: 24, textAlign: 'center' },
  toggle: {
    backgroundColor: '#3c3c3c',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  toggleOn: {
    backgroundColor: '#22c55e',
  },
  toggleText: { color: '#6b6b6b', fontWeight: '600', fontSize: 13 },
  toggleTextOn: { color: '#ffffff' },
  bottomPadding: { height: 40 },
});
