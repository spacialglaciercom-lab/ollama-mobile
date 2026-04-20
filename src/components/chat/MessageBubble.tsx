import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export function MessageBubble({ role, content }: MessageBubbleProps) {
  if (role === 'system') {
    return (
      <View style={styles.systemContainer}>
        <Text style={styles.systemText}>{content}</Text>
      </View>
    );
  }

  const isUser = role === 'user';

  return (
    <View
      style={[
        styles.container,
        isUser ? styles.userContainer : styles.assistantContainer,
      ]}
    >
      <Text style={[styles.text, isUser ? styles.userText : styles.assistantText]}>
        {content}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: '85%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    marginBottom: 8,
  },
  userContainer: {
    backgroundColor: '#8B5CF6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistantContainer: {
    backgroundColor: '#1a1a1a',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  text: { fontSize: 15, lineHeight: 22 },
  userText: { color: '#fff' },
  assistantText: { color: '#e5e5e5' },
  systemContainer: {
    backgroundColor: '#2a1a4a',
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
  },
  systemText: { color: '#8B5CF6', fontSize: 13, fontStyle: 'italic' },
});