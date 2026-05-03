import * as Haptics from 'expo-haptics';
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  selected?: boolean;
  onLongPress?: () => void;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  selected,
  onLongPress,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <View style={styles.bubbleWrap}>
        <View style={[styles.bubble, styles.bubbleSystem, selected && styles.bubbleWrapSelected]}>
          <Text style={styles.systemText}>{content}</Text>
        </View>
      </View>
    );
  }

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLongPress?.();
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.8}
      delayLongPress={300}
      accessibilityRole="button"
      accessibilityLabel={`Message from ${role}: ${content}`}
      accessibilityHint="Long press for more actions"
    >
      <View
        style={[
          styles.bubbleWrap,
          isUser ? styles.bubbleWrapUser : styles.bubbleWrapAssistant,
          selected && styles.bubbleWrapSelected,
        ]}
      >
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAssistant]}>
          <Text style={[styles.bubbleText, isUser ? styles.bubbleUserText : styles.bubbleAssistantText]}>
            {content}
          </Text>
        </View>
        {isStreaming && role === 'assistant' && <Text style={styles.cursor}>▌</Text>}
      </View>
    </TouchableOpacity>
  );
}

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
  systemText: { color: 'rgba(48,209,88,0.7)', fontSize: 13, fontStyle: 'italic' },
  bubbleText: { fontSize: 16 },
  bubbleUserText: { color: '#fff' },
  bubbleAssistantText: { color: '#fff' },
  cursor: { color: '#30d158', fontSize: 14, marginTop: 2 },
});
