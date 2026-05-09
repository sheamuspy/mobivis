import { useRef, useEffect, useState, useCallback } from 'react';
import { View, StyleSheet, ActivityIndicator, Text } from 'react-native';
import { WebView } from 'react-native-webview';
import type { EditorFile } from '../types';

interface MonacoEditorProps {
  file: EditorFile | null;
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
    #container { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="container"></div>
  <script src="https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs/loader.js"></script>
  <script>
    require.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });
    require(['vs/editor/editor.main'], function() {
      window.editor = monaco.editor.create(document.getElementById('container'), {
        value: '',
        language: 'javascript',
        theme: 'vs-dark',
        fontSize: 14,
        fontFamily: 'Menlo, Monaco, monospace',
        minimap: { enabled: false },
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        tabSize: 2,
      });

      window.editor.onDidChangeModelContent(() => {
        const content = window.editor.getValue();
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', content }));
      });

      window.editor.onDidChangeCursorPosition((e) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'cursor',
          line: e.position.lineNumber,
          column: e.position.column
        }));
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
    });

    function setContent(content, language) {
      if (window.editor) {
        const model = window.editor.getModel();
        monaco.editor.setModelLanguage(model, language || 'plaintext');
        window.editor.setValue(content || '');
      }
    }

    function setTheme(theme) {
      if (window.editor && theme === 'dark') {
        monaco.editor.setTheme('vs-dark');
      } else {
        monaco.editor.setTheme('vs');
      }
    }
  </script>
</body>
</html>
`;

export default function MonacoEditor({ file, onContentChange, onCursorChange }: MonacoEditorProps) {
  const webViewRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [webViewReady, setWebViewReady] = useState(false);

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
      } else if (msg.type === 'change' && onContentChange) {
        onContentChange(msg.content);
      } else if (msg.type === 'cursor' && onCursorChange) {
        onCursorChange(msg.line, msg.column);
      }
    } catch {}
  }, [onContentChange, onCursorChange]);

  return (
    <View style={styles.container}>
      {webViewReady === false && (
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
        bounces={false}
        scrollEnabled={false}
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
