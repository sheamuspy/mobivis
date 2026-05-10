import { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import type { EditorFile } from '../types';

interface MonacoEditorProps {
  file: EditorFile | null;
  theme?: string;
  fontSize?: number;
  tabSize?: number;
  wordWrap?: boolean;
  lineNumbers?: boolean;
  minimap?: boolean;
  onContentChange?: (content: string) => void;
  onCursorChange?: (line: number, column: number) => void;
}

const MONACO_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    body { overflow: auto; }
    #container { width: 100%; height: 100%; overflow: auto; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
  <script>
    var editor = null;
    
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function() {
      editor = monaco.editor.create(document.getElementById('container'), {
        value: '',
        language: 'javascript',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, Courier New, monospace',
        fontLigatures: false,
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'off',
        tabSize: 2,
        renderWhitespace: 'selection',
        cursorBlinking: 'smooth',
        smoothScrolling: true,
        padding: { top: 8, left: 8 },
      });

      editor.onDidChangeModelContent(function() {
        var content = editor.getValue();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', content: content }));
      });

      editor.onDidChangeCursorPosition(function(e) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'cursor',
          line: e.position.lineNumber,
          column: e.position.column
        }));
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    });

    function setContent(content, language) {
      if (editor) {
        var model = editor.getModel();
        if (!model) return;
        monaco.editor.setModelLanguage(model, language || 'plaintext');
        editor.setValue(content || '');
      }
    }

    function setTheme(theme) {
      if (editor && monaco) {
        monaco.editor.setTheme(theme || 'vs-dark');
      }
    }

    function setFontSize(size) {
      if (editor) {
        editor.updateOptions({ fontSize: size || 14 });
      }
    }

    function setTabSize(size) {
      if (editor) {
        editor.updateOptions({ tabSize: size || 2 });
      }
    }

    function setWordWrap(wrap) {
      if (editor) {
        editor.updateOptions({ wordWrap: wrap ? 'on' : 'off' });
      }
    }

    function setLineNumbers(show) {
      if (editor) {
        editor.updateOptions({ lineNumbers: show ? 'on' : 'off' });
      }
    }

    function setMinimap(show) {
      if (editor) {
        editor.updateOptions({ minimap: { enabled: show } });
      }
    }
  </script>
</body>
</html>
`;

export default function MonacoEditor({ 
  file, 
  theme = 'vs-dark',
  fontSize = 14,
  tabSize = 2,
  wordWrap = false,
  lineNumbers = true,
  minimap = false,
  onContentChange, 
  onCursorChange 
}: MonacoEditorProps) {
  const webViewRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);
  const lastSettings = useRef({ theme, fontSize, tabSize, wordWrap, lineNumbers, minimap });

  // Apply settings when they change
  useEffect(() => {
    if (ready) {
      if (theme !== lastSettings.current.theme) {
        webViewRef.current?.injectJavaScript(`setTheme('${theme}');`);
        lastSettings.current.theme = theme;
      }
      if (fontSize !== lastSettings.current.fontSize) {
        webViewRef.current?.injectJavaScript(`setFontSize(${fontSize});`);
        lastSettings.current.fontSize = fontSize;
      }
      if (tabSize !== lastSettings.current.tabSize) {
        webViewRef.current?.injectJavaScript(`setTabSize(${tabSize});`);
        lastSettings.current.tabSize = tabSize;
      }
      if (wordWrap !== lastSettings.current.wordWrap) {
        webViewRef.current?.injectJavaScript(`setWordWrap(${wordWrap});`);
        lastSettings.current.wordWrap = wordWrap;
      }
      if (lineNumbers !== lastSettings.current.lineNumbers) {
        webViewRef.current?.injectJavaScript(`setLineNumbers(${lineNumbers});`);
        lastSettings.current.lineNumbers = lineNumbers;
      }
      if (minimap !== lastSettings.current.minimap) {
        webViewRef.current?.injectJavaScript(`setMinimap(${minimap});`);
        lastSettings.current.minimap = minimap;
      }
    }
  }, [theme, fontSize, tabSize, wordWrap, lineNumbers, minimap, ready]);

  // Load file content when file changes
  useEffect(() => {
    if (ready && file) {
      const script = `setContent(${JSON.stringify(file.content)}, ${JSON.stringify(file.language)});`;
      webViewRef.current?.injectJavaScript(script);
    }
  }, [file, ready]);

  const handleMessage = useCallback((event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'ready') {
        setReady(true);
        // Apply initial settings
        webViewRef.current?.injectJavaScript(`setTheme('${theme}');`);
        webViewRef.current?.injectJavaScript(`setFontSize(${fontSize});`);
        webViewRef.current?.injectJavaScript(`setTabSize(${tabSize});`);
        webViewRef.current?.injectJavaScript(`setWordWrap(${wordWrap});`);
        webViewRef.current?.injectJavaScript(`setLineNumbers(${lineNumbers});`);
        webViewRef.current?.injectJavaScript(`setMinimap(${minimap});`);
      } else if (msg.type === 'change' && onContentChange) {
        onContentChange(msg.content);
      } else if (msg.type === 'cursor' && onCursorChange) {
        onCursorChange(msg.line, msg.column);
      }
    } catch {}
  }, [onContentChange, onCursorChange, theme, fontSize, tabSize, wordWrap, lineNumbers, minimap]);

  return (
    <View style={styles.container}>
      {!webViewReady && (
        <View style={styles.loading}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.loadingText}>Loading editor...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ html: MONACO_HTML }}
        style={styles.webview}
        onMessage={handleMessage}
        onLoadEnd={() => setWebViewReady(true)}
        javaScriptEnabled
        originWhitelist={['*']}
        bounces={true}
        scrollEnabled={true}
        horizontalScrollBarEnabled={true}
        showsHorizontalScrollIndicator={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1e1e1e' },
  webview: { flex: 1 },
  loading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1e1e1e',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: { color: '#888', marginTop: 8, fontSize: 14 },
});
