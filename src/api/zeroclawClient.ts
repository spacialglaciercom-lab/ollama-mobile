import { Message, ChatResponse } from './types';

export async function pingZeroClaw(baseUrl: string, _apiKey?: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const wsUrl = baseUrl.replace(/\/+$/, '').replace(/^http/, 'ws') + '/acp';
      const ws = new WebSocket(wsUrl);
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        // Try to send initialize to be sure
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 'ping',
            method: 'initialize',
            params: {},
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.id === 'ping') {
            ws.close();
            resolve(true);
          }
        } catch (e) {
          ws.close();
          resolve(false);
        }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        resolve(false);
      };
    } catch (e) {
      resolve(false);
    }
  });
}

export async function* streamZeroClawChat(
  baseUrl: string,
  _apiKey: string | undefined,
  messages: Message[]
): AsyncGenerator<ChatResponse, void, unknown> {
  const wsUrl = baseUrl.replace(/\/+$/, '').replace(/^http/, 'ws') + '/acp';

  // ACP sessions are isolated, so we either send the last message
  // or format the whole history into the prompt.
  // For a basic integration, formatting history might be better if the agent
  // is expected to be stateless across ACP calls.
  // But usually ACP is for interactive use.
  // We'll send the last message as the prompt for now.
  const lastMessage = messages[messages.length - 1].content;

  const queue: ChatResponse[] = [];
  let resolveNext: ((value: { value: ChatResponse | undefined; done: boolean }) => void) | null =
    null;
  let finished = false;
  let streamError: Error | null = null;

  const push = (val: ChatResponse) => {
    if (resolveNext) {
      resolveNext({ value: val, done: false });
      resolveNext = null;
    } else {
      queue.push(val);
    }
  };

  const finish = () => {
    finished = true;
    if (resolveNext) {
      resolveNext({ value: undefined, done: true });
      resolveNext = null;
    }
  };

  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {},
      })
    );
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.id === 1) {
        // Initialize success, create session
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 2,
            method: 'session/new',
            params: {},
          })
        );
      } else if (data.id === 2) {
        // Session created, send prompt
        ws.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'session/prompt',
            params: {
              sessionId: data.result.sessionId,
              prompt: lastMessage,
            },
          })
        );
      } else if (data.method === 'session/update') {
        const update = data.params.update;
        if (update.sessionUpdate === 'agent_message_chunk') {
          push({
            model: 'zeroclaw',
            message: { role: 'assistant', content: update.content.text },
            done: false,
          });
        }
      } else if (data.id === 3) {
        // Prompt finished
        push({
          model: 'zeroclaw',
          message: { role: 'assistant', content: '' },
          done: true,
        });
        ws.close();
        finish();
      }
    } catch (e) {
      streamError = e instanceof Error ? e : new Error(String(e));
      ws.close();
      finish();
    }
  };

  ws.onerror = () => {
    streamError = new Error('WebSocket error');
    finish();
  };

  ws.onclose = () => {
    finish();
  };

  while (true) {
    if (queue.length > 0) {
      yield queue.shift()!;
      continue;
    }
    if (finished) break;

    const next = await new Promise<{ value: ChatResponse | undefined; done: boolean }>(
      (resolve) => {
        resolveNext = resolve;
      }
    );
    if (next.done) break;
    if (next.value) yield next.value;
  }

  if (streamError) throw streamError;
}
