import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { StoredMessage } from '../../api/types';

export interface MessageBubbleProps {
  message?: StoredMessage;
  role?: 'user' | 'assistant' | 'system';
  content?: string;
  onLongPress?: () => void;
}

export function MessageBubble({ message, role, content, onLongPress }: MessageBubbleProps) {
  const effectiveRole = message?.role ?? role ?? 'assistant';
  const effectiveContent = message?.content ?? content ?? '';

  const isUser = effectiveRole === 'user';
  const isSystem = effectiveRole === 'system';

  const BubbleWrapper = onLongPress ? TouchableOpacity : View;

  return (
    <BubbleWrapper
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={[styles.container, isUser ? styles.user : isSystem ? styles.system : styles.assistant]}
    >
      <Text style={[styles.text, isSystem && styles.systemText]}>{effectiveContent}</Text>
    </BubbleWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 16,
    marginVertical: 4,
    maxWidth: '85%',
  },
  user: {
    backgroundColor: '#1a3a5c',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  assistant: {
    backgroundColor: '#1c1c1e',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
  },
  system: {
    backgroundColor: 'rgba(48,209,88,0.08)',
    alignSelf: 'center',
    maxWidth: '95%',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(48,209,88,0.2)',
    borderRadius: 12,
  },
  text: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  systemText: {
    color: 'rgba(48,209,88,0.7)',
    fontSize: 13,
    lineHeight: 18,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
