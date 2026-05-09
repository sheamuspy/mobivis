import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../../App';
import type { DiffLine } from '../types';

type Props = NativeStackScreenProps<RootStackParamList, 'Diff'>;

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

function lineBackground(type: DiffLine['type']): string {
  switch (type) {
    case 'added': return '#052E16';
    case 'removed': return '#2D0000';
    default: return 'transparent';
  }
}

function lineTextColor(type: DiffLine['type']): string {
  switch (type) {
    case 'added': return '#86EFAC';
    case 'removed': return '#FCA5A5';
    default: return '#CBD5E1';
  }
}

function gutterText(type: DiffLine['type']): string {
  switch (type) {
    case 'added': return '+';
    case 'removed': return '-';
    default: return ' ';
  }
}

function gutterColor(type: DiffLine['type']): string {
  switch (type) {
    case 'added': return '#4ADE80';
    case 'removed': return '#F87171';
    default: return '#334155';
  }
}

export default function DiffScreen({ navigation, route }: Props) {
  const { event } = route.params;
  const [changedOnly, setChangedOnly] = useState(true);
  const insets = useSafeAreaInsets();

  const fileName = event.filePath.split('/').pop() ?? event.filePath;
  const timestamp = new Date(event.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const displayLines = changedOnly
    ? event.diff.filter((l) => l.type !== 'unchanged')
    : event.diff;

  const handleShare = () => {
    const body = event.diff
      .filter((l) => l.type !== 'unchanged')
      .map((l) => `${gutterText(l.type)} ${l.content}`)
      .join('\n');
    Share.share({
      message: `${event.filePath}\n+${event.linesAdded} / -${event.linesRemoved}\n\n${body}`,
      title: `diff: ${fileName}`,
    });
  };

  const renderLine = ({ item: line }: { item: DiffLine }) => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ backgroundColor: lineBackground(line.type) }}
      contentContainerStyle={styles.lineRow}
    >
      <Text style={styles.lineNumber}>{String(line.lineNumber).padStart(4, ' ')}</Text>
      <Text style={[styles.gutter, { color: gutterColor(line.type) }]}>{gutterText(line.type)}</Text>
      <Text style={[styles.lineContent, { color: lineTextColor(line.type) }]}>
        {line.content || ' '}
      </Text>
    </ScrollView>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Text style={styles.navText}>← Feed</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleShare} hitSlop={12}>
          <Text style={styles.navText}>Share</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>{fileName}</Text>
        <Text style={styles.filePath} numberOfLines={2}>{event.filePath}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaAdded}>+{event.linesAdded}</Text>
          <Text style={styles.metaRemoved}>-{event.linesRemoved}</Text>
          <View style={styles.metaSpacer} />
          <Text style={styles.metaTime}>{timestamp}</Text>
        </View>
      </View>

      <View style={styles.toggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, changedOnly && styles.toggleActive]}
          onPress={() => setChangedOnly(true)}
        >
          <Text style={[styles.toggleLabel, changedOnly && styles.toggleLabelActive]}>
            Changed only
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, !changedOnly && styles.toggleActive]}
          onPress={() => setChangedOnly(false)}
        >
          <Text style={[styles.toggleLabel, !changedOnly && styles.toggleLabelActive]}>
            Full file
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={displayLines}
        keyExtractor={(_, i) => String(i)}
        renderItem={renderLine}
        style={styles.diff}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ItemSeparatorComponent={() => <View style={styles.lineSep} />}
        showsVerticalScrollIndicator={false}
        initialNumToRender={40}
        maxToRenderPerBatch={40}
        windowSize={10}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  navText: {
    fontSize: 16,
    color: '#3B82F6',
    fontWeight: '600',
  },
  fileInfo: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  fileName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#F8FAFC',
    fontFamily: MONO,
  },
  filePath: {
    fontSize: 11,
    color: '#475569',
    fontFamily: MONO,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
  },
  metaAdded: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4ADE80',
  },
  metaRemoved: {
    fontSize: 14,
    fontWeight: '700',
    color: '#F87171',
  },
  metaSpacer: {
    flex: 1,
  },
  metaTime: {
    fontSize: 12,
    color: '#475569',
  },
  toggle: {
    flexDirection: 'row',
    margin: 12,
    backgroundColor: '#1E293B',
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: '#334155',
  },
  toggleLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  toggleLabelActive: {
    color: '#F8FAFC',
  },
  diff: {
    flex: 1,
  },
  lineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 6,
    minWidth: '100%',
  },
  lineNumber: {
    width: 38,
    fontSize: 11,
    color: '#334155',
    fontFamily: MONO,
    textAlign: 'right',
    paddingRight: 8,
  },
  gutter: {
    width: 14,
    fontSize: 12,
    fontFamily: MONO,
    textAlign: 'center',
  },
  lineContent: {
    fontSize: 12,
    fontFamily: MONO,
    paddingLeft: 6,
  },
  lineSep: {
    height: 1,
    backgroundColor: '#0F172A',
  },
});
