import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';

type Props = NativeStackScreenProps<RootStackParamList, 'Connect'>;

const STORAGE_KEY = '@mobivis_ws_url';

export default function ConnectScreen({ navigation }: Props) {
  const [url, setUrl] = useState('ws://');
  const insets = useSafeAreaInsets();

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved) setUrl(saved);
    });
  }, []);

  const handleConnect = async () => {
    const trimmed = url.trim();
    if (!trimmed || trimmed === 'ws://') return;
    await AsyncStorage.setItem(STORAGE_KEY, trimmed);
    navigation.navigate('Feed', { url: trimmed });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.brand}>
          <Text style={styles.logo}>MobiVis</Text>
          <Text style={styles.subtitle}>Real-time code change visualiser</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>WEBSOCKET URL</Text>
          <TextInput
            style={styles.input}
            value={url}
            onChangeText={setUrl}
            placeholder="ws://192.168.x.x:4747"
            placeholderTextColor="#475569"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="go"
            onSubmitEditing={handleConnect}
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleConnect} activeOpacity={0.8}>
          <Text style={styles.buttonText}>Connect</Text>
        </TouchableOpacity>

        <View style={styles.hint}>
          <Text style={styles.hintTitle}>Start the server first:</Text>
          <Text style={styles.hintCode}>{'cd mobivis/server'}</Text>
          <Text style={styles.hintCode}>{'npm run dev /path/to/project'}</Text>
          <Text style={styles.hintSub}>Then enter the printed WebSocket URL above</Text>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 28,
  },
  brand: {
    gap: 6,
  },
  logo: {
    fontSize: 38,
    fontWeight: '800',
    color: '#F8FAFC',
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    letterSpacing: 1,
  },
  input: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#F8FAFC',
    fontFamily: MONO,
    borderWidth: 1,
    borderColor: '#334155',
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  hint: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 16,
    gap: 6,
    borderWidth: 1,
    borderColor: '#334155',
  },
  hintTitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 2,
  },
  hintCode: {
    fontSize: 13,
    fontFamily: MONO,
    color: '#22D3EE',
  },
  hintSub: {
    fontSize: 12,
    color: '#475569',
    marginTop: 4,
  },
});
