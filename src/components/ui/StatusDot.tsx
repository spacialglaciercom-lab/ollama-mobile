import React from 'react';
import { View, StyleSheet } from 'react-native';

interface StatusDotProps {
  connected: boolean;
  size?: number;
}

export function StatusDot({ connected, size = 8 }: StatusDotProps) {
  return (
    <View
      style={[
        styles.dot,
        {
          backgroundColor: connected ? '#4ade80' : '#f87171',
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {
    // Dynamic styles set inline
  },
});
