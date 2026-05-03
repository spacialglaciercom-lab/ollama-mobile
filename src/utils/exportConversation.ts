import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Conversation, StoredMessage } from '../api/types';

export async function exportConversationAsMarkdown(
  conversation: Conversation,
  messages: StoredMessage[]
): Promise<void> {
  const date = new Date(conversation.createdAt).toISOString().split('T')[0];
  const model = conversation.model;

  let markdown = "# " + conversation.title + "\n\n";
  markdown += "**Date:** " + date + "  \n";
  markdown += "**Model:** " + model + "\n\n";
  markdown += "---\n\n";

  // Add system prompt if exists
  if (conversation.systemPrompt) {
    markdown += "**System Prompt:**\n\n" + conversation.systemPrompt + "\n\n---\n\n";
  }

  // Add messages
  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
    const time = new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    markdown += "### " + roleLabel + " — " + time + "\n\n";
    markdown += msg.content + "\n\n";
  }

  // Write to file and share
  const filename = conversation.title.replace(/[^a-z0-9]/gi, '_') + "_" + date + ".md";
  const docDir = (FileSystem as any).documentDirectory || '';
  const fileUri = docDir + filename;
  
  await FileSystem.writeAsStringAsync(fileUri, markdown, {
    encoding: (FileSystem as any).EncodingType?.UTF8 || 'utf8',
  });

  await Sharing.shareAsync(fileUri, {
    mimeType: 'text/markdown',
    dialogTitle: 'Export Conversation',
    UTI: 'org.openoffice.markdown-text',
  });
}

export function conversationToMarkdown(
  conversation: Conversation,
  messages: StoredMessage[]
): string {
  const date = new Date(conversation.createdAt).toISOString().split('T')[0];

  let markdown = "# " + conversation.title + "\n\n";
  markdown += "**Date:** " + date + "  \n";
  markdown += "**Model:** " + conversation.model + "\n\n";
  markdown += "---\n\n";

  if (conversation.systemPrompt) {
    markdown += "**System Prompt:**\n\n" + conversation.systemPrompt + "\n\n---\n\n";
  }

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
    const time = new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    markdown += "### " + roleLabel + " — " + time + "\n\n";
    markdown += msg.content + "\n\n";
  }

  return markdown;
}
