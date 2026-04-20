import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreamingBubbleProps {
  text: string;
  isStreaming: boolean;
}

export function StreamingBubble({ text, isStreaming }: StreamingBubbleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{text}</Text>
      {isStreaming && <Text style={styles.cursor}>▌</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
    backgroundColor: '#1c1c1e',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    marginBottom: 8,
  },
  text: { color: '#e5e5e5', fontSize: 15, lineHeight: 21 },
  cursor: { color: '#30d158', fontSize: 14, marginTop: 2 },
});