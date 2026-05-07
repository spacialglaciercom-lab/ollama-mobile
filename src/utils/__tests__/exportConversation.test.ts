import { conversationToMarkdown } from '../exportConversation';
import { Conversation, StoredMessage } from '../../api/types';

describe('conversationToMarkdown', () => {
  const conversation: Conversation = {
    id: '1',
    title: 'Test Chat',
    model: 'test-model',
    systemPrompt: 'System Instruction',
    createdAt: new Date('2024-05-07T10:00:00Z').getTime(),
    updatedAt: new Date('2024-05-07T10:00:00Z').getTime(),
  };

  const messages: StoredMessage[] = [
    {
      id: 'm1',
      conversationId: '1',
      role: 'system',
      content: 'System Instruction',
      createdAt: new Date('2024-05-07T10:00:01Z').getTime(),
    },
    {
      id: 'm2',
      conversationId: '1',
      role: 'user',
      content: 'Hello assistant!',
      createdAt: new Date('2024-05-07T10:00:02Z').getTime(),
    },
    {
      id: 'm3',
      conversationId: '1',
      role: 'assistant',
      content: 'Hello user! How can I help?',
      createdAt: new Date('2024-05-07T10:00:03Z').getTime(),
    },
  ];

  it('correctly formats conversation metadata and messages', () => {
    const result = conversationToMarkdown(conversation, messages);

    expect(result).toContain('# Test Chat');
    expect(result).toContain('**Date:** 2024-05-07');
    expect(result).toContain('**Model:** test-model');
    expect(result).toContain('**System Prompt:**\n\nSystem Instruction');

    // Check if system message from the list is ignored (redundant since prompt is in metadata)
    // The code does: if (msg.role === 'system') continue;
    expect(result).not.toContain('### System');

    expect(result).toContain('### User');
    expect(result).toContain('Hello assistant!');
    expect(result).toContain('### Assistant');
    expect(result).toContain('Hello user! How can I help?');
  });

  it('handles empty system prompt', () => {
    const emptyPromptConv = { ...conversation, systemPrompt: undefined };
    const result = conversationToMarkdown(emptyPromptConv, messages);

    expect(result).not.toContain('**System Prompt:**');
  });
});
