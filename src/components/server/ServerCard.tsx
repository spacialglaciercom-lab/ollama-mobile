import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Server } from '../store/useServerStore';
import { StatusDot } from './StatusDot';

interface ServerCardProps {
  server: Server;
  isActive: boolean;
  onConnect: () => void;
}

export function ServerCard({ server, isActive, onConnect }: ServerCardProps) {
  return (
    <TouchableOpacity onPress={onConnect} activeOpacity={0.7}>
      <View style={[styles.card, isActive && styles.cardActive]}>
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <StatusDot connected={true} />
            <Text style={styles.name}>{server.name}</Text>
            {server.isCloud && <Text style={styles.cloudBadge}>Cloud</Text>}
          </View>
          <Text style={styles.url} numberOfLines={1}>
            {server.url}
          </Text>
        </View>
        {isActive && <Text style={styles.activeLabel}>Active</Text>}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  cardActive: {
    borderColor: '#8B5CF6',
    borderWidth: 1,
  },
  info: {},
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cloudBadge: {
    color: '#8B5CF6',
    fontSize: 11,
    fontWeight: '600',
    backgroundColor: '#2a1a4a',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  url: { color: '#888', fontSize: 13, marginTop: 4 },
  activeLabel: {
    color: '#8B5CF6',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});