import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { Conversation, StoredMessage } from '../api/types';

export async function exportConversationAsMarkdown(
  conversation: Conversation,
  messages: StoredMessage[]
): Promise<void> {
  const date = new Date(conversation.createdAt).toISOString().split('T')[0];
  const model = conversation.model;

  let markdown = `# ${conversation.title}

`;
  markdown += `**Date:** ${date}
`;
  markdown += `**Model:** ${model}

`;
  markdown += `---

`;

  // Add system prompt if exists
  if (conversation.systemPrompt) {
    markdown += `**System Prompt:**

${conversation.systemPrompt}

---

`;
  }

  // Add messages
  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
    const time = new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    markdown += `### ${roleLabel} — ${time}

`;
    markdown += `${msg.content}

`;
  }

  // Write to file and share
  const filename = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}_${date}.md`;
  const fs = FileSystem as any;
  const targetUri = `${fs.documentDirectory}${filename}`;

  await FileSystem.writeAsStringAsync(targetUri, markdown, {
    encoding: fs.EncodingType.UTF8,
  });

  await Sharing.shareAsync(targetUri, {
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

  let markdown = `# ${conversation.title}

`;
  markdown += `**Date:** ${date}
`;
  markdown += `**Model:** ${conversation.model}

`;
  markdown += `---

`;

  if (conversation.systemPrompt) {
    markdown += `**System Prompt:**

${conversation.systemPrompt}

---

`;
  }

  for (const msg of messages) {
    if (msg.role === 'system') continue;

    const roleLabel = msg.role === 'user' ? 'User' : 'Assistant';
    const time = new Date(msg.createdAt).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    markdown += `### ${roleLabel} — ${time}

`;
    markdown += `${msg.content}

`;
  }

  return markdown;
}
