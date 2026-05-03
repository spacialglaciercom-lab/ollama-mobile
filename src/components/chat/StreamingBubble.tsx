import React, { memo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface StreamingBubbleProps {
  content: string;
  thought?: string;
}

/**
 * Memoized StreamingBubble component to minimize re-renders during active token streaming.
 */
export const StreamingBubble = memo(({ content, thought }: StreamingBubbleProps) => {
  const [showThought, setShowThought] = useState(true);

  return (
    <View style={styles.bubbleWrapAssistant}>
      {thought && (
        <View style={styles.thoughtContainer}>
          <TouchableOpacity
            onPress={() => setShowThought(!showThought)}
            style={styles.thoughtHeader}
          >
            <Text style={styles.thoughtTitle}>
              {showThought ? '▼ Reasoning' : '▶ Reasoning'}
            </Text>
          </TouchableOpacity>
          {showThought && (
            <View style={styles.thoughtBody}>
              <Text style={styles.thoughtText}>{thought}</Text>
            </View>
          )}
        </View>
      )}

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
  bubbleText: { color: '#fff', fontSize: 17, lineHeight: 21 },
  cursor: { color: '#30d158', fontSize: 14 },
  thoughtContainer: {
    marginBottom: 4,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  thoughtHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  thoughtTitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  thoughtBody: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  thoughtText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontStyle: 'italic',
    lineHeight: 18,
  },
});
