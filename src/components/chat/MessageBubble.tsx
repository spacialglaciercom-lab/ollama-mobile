import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system';
  content: string;
  thought?: string;
  selected?: boolean;
  onLongPress?: () => void;
  isStreaming?: boolean;
}

export function MessageBubble({
  role,
  content,
  thought,
  selected,
  onLongPress,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === 'user';
  const isAssistant = role === 'assistant';
  const isSystem = role === 'system';
  const [showThought, setShowThought] = useState(false);

  const handleLongPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onLongPress?.();
  };

  if (isSystem) {
    return (
      <View style={styles.bubbleWrapSystem}>
        <View style={styles.bubbleSystem}>
          <Text style={styles.systemText}>{content}</Text>
        </View>
      </View>
    );
  }

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
        {thought && isAssistant && (
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

        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleAssistant,
          ]}
        >
          <Text style={[styles.bubbleText, isUser ? styles.userText : styles.assistantText]}>
            {content}
          </Text>
          {isStreaming && isAssistant && <Text style={styles.cursor}>▌</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bubbleWrap: { marginBottom: 8 },
  bubbleWrapUser: { alignSelf: 'flex-end', maxWidth: '80%' },
  bubbleWrapAssistant: { alignSelf: 'flex-start', maxWidth: '80%' },
  bubbleWrapSystem: { alignSelf: 'center', maxWidth: '90%', marginBottom: 12 },
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
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  bubbleText: {
    fontSize: 17,
  },
  userText: { color: '#fff' },
  assistantText: { color: '#fff' },
  systemText: { color: 'rgba(48,209,88,0.7)', fontSize: 13, fontStyle: 'italic', textAlign: 'center' },
  cursor: { color: '#30d158', fontSize: 14, marginTop: 2 },
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
