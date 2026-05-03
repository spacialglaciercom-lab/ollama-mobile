import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  selected?: boolean;
  onLongPress?: () => void;
}

/**
 * Memoized MessageBubble component to prevent unnecessary re-renders in large chat lists.
 */
export const MessageBubble = memo(
  ({ role, content, selected, onLongPress }: MessageBubbleProps) => {
    const isUser = role === 'user';
    const isSystem = role === 'system';

    return (
      <TouchableOpacity
        onLongPress={onLongPress}
        activeOpacity={0.8}
        delayLongPress={300}
        disabled={isSystem}
      >
        <View
          style={[
            styles.bubbleWrap,
            isUser
              ? styles.bubbleWrapUser
              : isSystem
                ? styles.bubbleWrapSystem
                : styles.bubbleWrapAssistant,
            selected && styles.bubbleWrapSelected,
          ]}
        >
          <View
            style={[
              styles.bubble,
              isUser ? styles.bubbleUser : isSystem ? styles.bubbleSystem : styles.bubbleAssistant,
            ]}
          >
            <Text style={isSystem ? styles.bubbleSystemText : styles.bubbleText}>{content}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }
);

const styles = StyleSheet.create({
  bubbleWrap: { marginBottom: 8 },
  bubbleWrapUser: { alignSelf: 'flex-end', maxWidth: '80%' },
  bubbleWrapAssistant: { alignSelf: 'flex-start', maxWidth: '80%' },
  bubbleWrapSystem: { alignSelf: 'center', maxWidth: '90%' },
  bubbleWrapSelected: {
    borderWidth: 1.5,
    borderColor: '#30d158',
    borderRadius: 18,
  },
  bubble: { paddingHorizontal: 14, paddingVertical: 10 },
  bubbleUser: {
    backgroundColor: '#1a3a5c',
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  bubbleAssistant: {
    backgroundColor: '#1c1c1e',
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  bubbleSystem: {
    backgroundColor: 'rgba(48,209,88,0.08)',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48,209,88,0.2)',
  },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleSystemText: {
    color: 'rgba(48,209,88,0.7)',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
