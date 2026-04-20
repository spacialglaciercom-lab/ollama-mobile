import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { GitStatusResult } from '../api/gitClient';

interface GitStatusChipProps {
  status: GitStatusResult | null;
}

export function GitStatusChip({ status }: GitStatusChipProps) {
  if (!status) return null;

  const dirtyCount =
    status.modified.length + status.added.length + status.deleted.length + status.untracked.length;

  return (
    <View style={styles.container}>
      {dirtyCount > 0 && (
        <View style={[styles.chip, styles.chipDirty]}>
          <Text style={styles.chipText}>{dirtyCount} changed</Text>
        </View>
      )}
      {status.ahead > 0 && (
        <View style={[styles.chip, styles.chipAhead]}>
          <Text style={styles.chipText}>{status.ahead} ahead</Text>
        </View>
      )}
      {status.behind > 0 && (
        <View style={[styles.chip, styles.chipBehind]}>
          <Text style={styles.chipText}>{status.behind} behind</Text>
        </View>
      )}
      {dirtyCount === 0 && status.ahead === 0 && status.behind === 0 && (
        <View style={[styles.chip, styles.chipClean]}>
          <Text style={styles.chipText}>Clean</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  chip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  chipDirty: {
    backgroundColor: 'rgba(255,159,10,0.15)',
  },
  chipAhead: {
    backgroundColor: 'rgba(48,209,88,0.15)',
  },
  chipBehind: {
    backgroundColor: 'rgba(175,82,222,0.15)',
  },
  chipClean: {
    backgroundColor: 'rgba(48,209,88,0.1)',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(235,235,245,0.7)',
  },
});