import React, { useEffect, useRef } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import { useWebSocket } from '../hooks/useWebSocket';
import ChangeCard from '../components/ChangeCard';
import type { ChangeEvent } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

const STATUS_COLOR: Record<string, string> = {
  idle: '#475569',
  connecting: '#F59E0B',
  connected: '#22C55E',
  disconnected: '#EF4444',
  error: '#EF4444',
};

export default function FeedScreen({ navigation, route }: Props) {
  const { url } = route.params;
  const { status, events, watchDir, connect, disconnect } = useWebSocket();
  const insets = useSafeAreaInsets();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const prevCount = useRef(0);

  useEffect(() => {
    connect(url);
    return () => disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (events.length > prevCount.current) {
      prevCount.current = events.length;
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [events.length, pulseAnim]);

  const handleBack = () => {
    disconnect();
    navigation.goBack();
  };

  const dotColor = STATUS_COLOR[status] ?? '#475569';

  const statusLabel = (() => {
    switch (status) {
      case 'connecting': return 'Connecting…';
      case 'connected': return watchDir ? `/${watchDir.split('/').filter(Boolean).pop()}` : 'Connected';
      case 'disconnected': return 'Disconnected';
      case 'error': return 'Connection error';
      default: return 'Idle';
    }
  })();

  const renderItem = ({ item }: { item: ChangeEvent }) => (
    <ChangeCard
      event={item}
      onPress={() => navigation.navigate('Diff', { event: item })}
    />
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.back} hitSlop={12}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.statusRow}>
          <Animated.View
            style={[styles.dot, { backgroundColor: dotColor, transform: [{ scale: pulseAnim }] }]}
          />
          <Text style={styles.statusText} numberOfLines={1}>{statusLabel}</Text>
        </View>
      </View>

      {events.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyEmoji}>👁</Text>
          <Text style={styles.emptyTitle}>Watching for changes</Text>
          <Text style={styles.emptySub}>Save a file in the watched directory</Text>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 16 }]}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  back: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    flex: 1,
    justifyContent: 'flex-end',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 13,
    color: '#94A3B8',
    maxWidth: 220,
  },
  list: {
    padding: 12,
  },
  separator: {
    height: 8,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyEmoji: {
    fontSize: 52,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F8FAFC',
  },
  emptySub: {
    fontSize: 14,
    color: '#475569',
  },
});
