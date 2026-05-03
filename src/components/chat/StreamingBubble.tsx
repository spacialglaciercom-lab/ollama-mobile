import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StreamingBubbleProps {
  content: string;
}

/**
 * Memoized StreamingBubble component to minimize re-renders during active token streaming.
 */
export const StreamingBubble = memo(({ content }: StreamingBubbleProps) => {
  return (
    <View style={styles.bubbleWrapAssistant}>
      <View style={styles.bubbleAssistant}>
        <Text style={styles.bubbleText}>
          {content}
          <Text style={styles.cursor}>▌</Text>
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  bubbleWrapAssistant: {
    alignSelf: 'flex-start',
    maxWidth: '80%',
    marginBottom: 8,
  },
  bubbleAssistant: {
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  cursor: { color: '#30d158', fontSize: 14 },
});
