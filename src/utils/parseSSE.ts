/**
 * Parse newline-delimited JSON from Ollama streaming responses.
 * Ollama sends each JSON object on its own line.
 */
export function parseSSELine(line: string): Record<string, any> | null {
  if (!line.trim()) return null;

  try {
    return JSON.parse(line);
  } catch {
    return null;
  }
}

/**
 * Parse a full SSE buffer, returning all complete JSON objects.
 * Handles partial lines by keeping them in the buffer.
 */
export function parseSSEBuffer(buffer: string): {
  objects: Record<string, any>[];
  remaining: string;
} {
  const lines = buffer.split('\n');
  const objects: Record<string, any>[] = [];
  const remaining = lines.pop() ?? ''; // Keep last (potentially partial) line

  for (const line of lines) {
    const obj = parseSSELine(line);
    if (obj) objects.push(obj);
  }

  return { objects, remaining };
}
