import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import type { ChangeEvent } from '../types';

interface Props {
  event: ChangeEvent;
  onPress: () => void;
}

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const BADGE: Record<ChangeEvent['eventType'], { bg: string; text: string; label: string }> = {
  change: { bg: '#1E3A5F', text: '#60A5FA', label: 'modified' },
  add: { bg: '#14532D', text: '#4ADE80', label: 'created' },
  unlink: { bg: '#450A0A', text: '#F87171', label: 'deleted' },
};

function relativeTime(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  return `${Math.floor(sec / 3600)}h ago`;
}

export default function ChangeCard({ event, onPress }: Props) {
  const badge = BADGE[event.eventType];
  const fileName = event.filePath.split('/').pop() ?? event.filePath;
  const preview = event.diff.filter((l) => l.type !== 'unchanged').slice(0, 4);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.72}>
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: badge.bg }]}>
          <Text style={[styles.badgeText, { color: badge.text }]}>{badge.label}</Text>
        </View>
        <Text style={styles.time}>{relativeTime(event.timestamp)}</Text>
      </View>

      <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
      <Text style={styles.filePath} numberOfLines={1}>{event.filePath}</Text>

      <View style={styles.stats}>
        {event.linesAdded > 0 && <Text style={styles.added}>+{event.linesAdded}</Text>}
        {event.linesRemoved > 0 && <Text style={styles.removed}>-{event.linesRemoved}</Text>}
      </View>

      {preview.length > 0 && (
        <View style={styles.preview}>
          {preview.map((line, i) => (
            <View
              key={i}
              style={[styles.previewLine, line.type === 'added' ? styles.previewAdded : styles.previewRemoved]}
            >
              <Text style={styles.previewGutter}>{line.type === 'added' ? '+' : '-'}</Text>
              <Text style={styles.previewContent} numberOfLines={1}>
                {line.content || ' '}
              </Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  time: {
    fontSize: 12,
    color: '#475569',
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#F8FAFC',
    fontFamily: MONO,
  },
  filePath: {
    fontSize: 11,
    color: '#475569',
    fontFamily: MONO,
    marginTop: -4,
  },
  stats: {
    flexDirection: 'row',
    gap: 10,
  },
  added: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4ADE80',
  },
  removed: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F87171',
  },
  preview: {
    borderRadius: 6,
    overflow: 'hidden',
    gap: 1,
  },
  previewLine: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  previewAdded: {
    backgroundColor: '#052E16',
  },
  previewRemoved: {
    backgroundColor: '#2D0000',
  },
  previewGutter: {
    width: 14,
    fontSize: 11,
    fontFamily: MONO,
    color: '#64748B',
  },
  previewContent: {
    flex: 1,
    fontSize: 11,
    fontFamily: MONO,
    color: '#CBD5E1',
  },
});
