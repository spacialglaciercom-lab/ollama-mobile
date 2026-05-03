import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  selected?: boolean;
  onLongPress?: () => void;
}

export function MessageBubble({ role, content, selected, onLongPress }: MessageBubbleProps) {
  if (role === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{content}</Text>
      </View>
    );
  }

  const isUser = role === 'user';

  return (
    <TouchableOpacity onLongPress={onLongPress} activeOpacity={0.8} delayLongPress={300}>
      <View
        style={[
          styles.container,
          isUser ? styles.userContainer : styles.assistantContainer,
          selected && styles.selectedContainer,
        ]}
      >
        <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
          {content}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginBottom: 8,
  },
  userContainer: {
    backgroundColor: '#1a3a5c',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantContainer: {
    backgroundColor: '#1c1c1e',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  selectedContainer: {
    borderWidth: 1.5,
    borderColor: '#30d158',
    backgroundColor: 'rgba(44,44,46,0.9)',
  },
  text: { fontSize: 15, lineHeight: 21 },
  userText: { color: '#fff' },
  assistantText: { color: '#e5e5e5' },
  systemContainer: {
    backgroundColor: 'rgba(48,209,88,0.08)',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48,209,88,0.2)',
  },
  systemText: { color: 'rgba(48,209,88,0.7)', fontSize: 13, fontStyle: 'italic' },
});
