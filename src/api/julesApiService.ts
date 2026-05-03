import {
  JulesSource,
  JulesSession,
  JulesSessionCreateRequest,
  JulesSessionCreateResponse,
  JulesSourcesResponse,
  JulesApprovePlanResponse,
  JulesSendMessageRequest,
  JulesSendMessageResponse,
} from './types';

const JULES_API_BASE = 'https://jules.googleapis.com/v1alpha';

// Create headers for Jules API requests
function makeHeaders(apiKey: string): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Goog-Api-Key': apiKey,
  };
}

/**
 * Get the list of connected GitHub repositories (sources)
 */
export async function getSources(apiKey: string): Promise<JulesSource[]> {
  try {
    const url = `${JULES_API_BASE}/sources`;
    const response = await fetch(url, {
      method: 'GET',
      headers: makeHeaders(apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch sources: ${response.status} ${response.statusText}`);
    }

    const data = (await response.json()) as JulesSourcesResponse;
    return data.sources || [];
  } catch (error) {
    console.error('Error fetching Jules sources:', error);
    throw error;
  }
}

/**
 * Create a new Jules session
 * @param apiKey - Jules API key
 * @param sourceString - The source identifier (e.g., GitHub repo)
 * @param prompt - The initial prompt for the session
 * @param startingBranch - Optional starting branch for GitHub repo context
 * @param title - Optional title for the session
 */
export async function createSession(
  apiKey: string,
  sourceString: string,
  prompt: string,
  startingBranch?: string,
  title?: string
): Promise<JulesSessionCreateResponse> {
  try {
    const url = `${JULES_API_BASE}/sessions`;
    
    const payload: JulesSessionCreateRequest = {
      prompt,
      sourceContext: {
        source: sourceString,
        githubRepoContext: {
          startingBranch: startingBranch || 'main',
        },
      },
      title: title || `Session for ${sourceString}`,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: makeHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as JulesSessionCreateResponse;
  } catch (error) {
    console.error('Error creating Jules session:', error);
    throw error;
  }
}

/**
 * Approve the plan for a Jules session
 * @param apiKey - Jules API key
 * @param sessionId - The session ID to approve
 */
export async function approvePlan(apiKey: string, sessionId: string): Promise<JulesApprovePlanResponse> {
  try {
    const url = `${JULES_API_BASE}/sessions/${sessionId}:approvePlan`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: makeHeaders(apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to approve plan: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as JulesApprovePlanResponse;
  } catch (error) {
    console.error('Error approving Jules plan:', error);
    throw error;
  }
}

/**
 * Send a message to a Jules session
 * @param apiKey - Jules API key
 * @param sessionId - The session ID
 * @param message - The message to send
 */
export async function sendMessage(
  apiKey: string,
  sessionId: string,
  message: string
): Promise<JulesSendMessageResponse> {
  try {
    const url = `${JULES_API_BASE}/sessions/${sessionId}:sendMessage`;
    
    const payload: JulesSendMessageRequest = {
      prompt: message,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: makeHeaders(apiKey),
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Failed to send message: ${response.status} ${response.statusText}`);
    }

    return (await response.json()) as JulesSendMessageResponse;
  } catch (error) {
    console.error('Error sending message to Jules session:', error);
    throw error;
  }
}

// Re-export types for convenience
export type {
  JulesSource,
  JulesSession,
  JulesSessionCreateRequest,
  JulesSessionCreateResponse,
  JulesSourcesResponse,
  JulesApprovePlanResponse,
  JulesSendMessageRequest,
  JulesSendMessageResponse,
};
