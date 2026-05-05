import { getSources, createSession, approvePlan, sendMessage } from '../julesApiService';
import { JulesSource, JulesSessionCreateResponse } from '../types';

// Mock the global fetch function
global.fetch = jest.fn();

// Helper to mock fetch responses
const mockFetchResponse = (ok: boolean, status: number, jsonData: any = {}) => {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
  };
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    ok,
    status,
    statusText: statusTexts[status] || 'Unknown',
    json: jest.fn().mockResolvedValueOnce(jsonData),
  });
};

const mockFetchError = (error: Error) => {
  (global.fetch as jest.Mock).mockRejectedValueOnce(error);
};

const TEST_API_KEY = 'test-api-key-12345';

describe('julesApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSources', () => {
    const mockSources: JulesSource[] = [
      {
        id: 'source-1',
        name: 'my-repo',
        repositoryUri: 'https://github.com/user/my-repo',
        branch: 'main',
        state: 'ACTIVE',
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-02T00:00:00Z',
      },
      {
        id: 'source-2',
        name: 'another-repo',
        repositoryUri: 'https://github.com/user/another-repo',
        branch: 'develop',
        state: 'ACTIVE',
        createTime: '2024-01-03T00:00:00Z',
        updateTime: '2024-01-04T00:00:00Z',
      },
    ];

    it('should fetch sources successfully with valid API key', async () => {
      const mockResponse = { sources: mockSources };
      mockFetchResponse(true, 200, mockResponse);

      const result = await getSources(TEST_API_KEY);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('https://jules.googleapis.com/v1alpha/sources', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': TEST_API_KEY,
        },
      });
      expect(result).toEqual(mockSources);
    });

    it('should return empty array when response has no sources', async () => {
      mockFetchResponse(true, 200, { sources: [] });

      const result = await getSources(TEST_API_KEY);

      expect(result).toEqual([]);
    });

    it('should return empty array when sources is undefined in response', async () => {
      mockFetchResponse(true, 200, {});

      const result = await getSources(TEST_API_KEY);

      expect(result).toEqual([]);
    });

    it('should throw error when fetch fails with status 401', async () => {
      mockFetchResponse(false, 401);

      await expect(getSources(TEST_API_KEY)).rejects.toThrow('Failed to fetch sources: 401 401');
    });

    it('should throw error when fetch fails with status 404', async () => {
      mockFetchResponse(false, 404);

      await expect(getSources(TEST_API_KEY)).rejects.toThrow('Failed to fetch sources: 404 404');
    });

    it('should throw error when network request fails', async () => {
      const networkError = new Error('Network error');
      mockFetchError(networkError);

      await expect(getSources(TEST_API_KEY)).rejects.toThrow('Network error');
    });
  });

  describe('createSession', () => {
    const mockSessionResponse: JulesSessionCreateResponse = {
      session: {
        id: 'session-123',
        name: 'sessions/session-123',
        title: 'Test Session',
        state: 'PLAN_PENDING',
        sourceContext: {
          source: 'projects/my-project/repositories/my-repo',
          githubRepoContext: {
            startingBranch: 'main',
          },
        },
        createTime: '2024-01-01T00:00:00Z',
        updateTime: '2024-01-01T00:00:00Z',
      },
    };

    it('should create session with minimal required parameters', async () => {
      mockFetchResponse(true, 200, mockSessionResponse);

      const result = await createSession(
        TEST_API_KEY,
        'projects/my-project/repositories/my-repo',
        'Fix the bug'
      );

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith('https://jules.googleapis.com/v1alpha/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': TEST_API_KEY,
        },
        body: JSON.stringify({
          prompt: 'Fix the bug',
          sourceContext: {
            source: 'projects/my-project/repositories/my-repo',
            githubRepoContext: {
              startingBranch: 'main',
            },
          },
          title: 'Session for projects/my-project/repositories/my-repo',
        }),
      });
      expect(result).toEqual(mockSessionResponse);
    });

    it('should create session with custom branch and title', async () => {
      mockFetchResponse(true, 200, mockSessionResponse);

      await createSession(
        TEST_API_KEY,
        'projects/my-project/repositories/my-repo',
        'Add new feature',
        'feature-branch',
        'Custom Session Title'
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://jules.googleapis.com/v1alpha/sessions',
        expect.objectContaining({
          body: JSON.stringify({
            prompt: 'Add new feature',
            sourceContext: {
              source: 'projects/my-project/repositories/my-repo',
              githubRepoContext: {
                startingBranch: 'feature-branch',
              },
            },
            title: 'Custom Session Title',
          }),
        })
      );
    });

    it('should throw error when session creation fails', async () => {
      mockFetchResponse(false, 400, { error: { message: 'Invalid request' } });

      await expect(createSession(TEST_API_KEY, 'invalid-source', 'prompt')).rejects.toThrow(
        'Failed to create session: 400 400'
      );
    });

    it('should throw error when network request fails', async () => {
      const networkError = new Error('Connection refused');
      mockFetchError(networkError);

      await expect(createSession(TEST_API_KEY, 'source', 'prompt')).rejects.toThrow(
        'Connection refused'
      );
    });
  });

  describe('approvePlan', () => {
    const mockApproveResponse = {
      session: {
        id: 'session-123',
        name: 'sessions/session-123',
        state: 'RUNNING',
      },
      approved: true,
    };

    it('should approve plan for a session', async () => {
      mockFetchResponse(true, 200, mockApproveResponse);

      const result = await approvePlan(TEST_API_KEY, 'session-123');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://jules.googleapis.com/v1alpha/sessions/session-123:approvePlan',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': TEST_API_KEY,
          },
        }
      );
      expect(result).toEqual(mockApproveResponse);
    });

    it('should throw error when plan approval fails', async () => {
      mockFetchResponse(false, 403, { error: { message: 'Not authorized' } });

      await expect(approvePlan(TEST_API_KEY, 'session-123')).rejects.toThrow(
        'Failed to approve plan: 403 403'
      );
    });

    it('should throw error when session does not exist', async () => {
      mockFetchResponse(false, 404);

      await expect(approvePlan(TEST_API_KEY, 'non-existent-session')).rejects.toThrow(
        'Failed to approve plan: 404 404'
      );
    });
  });

  describe('sendMessage', () => {
    const mockMessageResponse = {
      session: {
        id: 'session-123',
        name: 'sessions/session-123',
        state: 'RUNNING',
      },
      message: {
        id: 'msg-456',
        content: 'I am working on your request...',
        role: 'assistant',
        createTime: '2024-01-01T00:00:00Z',
      },
    };

    it('should send message to a session', async () => {
      mockFetchResponse(true, 200, mockMessageResponse);

      const result = await sendMessage(TEST_API_KEY, 'session-123', 'Can you explain this code?');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        'https://jules.googleapis.com/v1alpha/sessions/session-123:sendMessage',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': TEST_API_KEY,
          },
          body: JSON.stringify({
            prompt: 'Can you explain this code?',
          }),
        }
      );
      expect(result).toEqual(mockMessageResponse);
    });

    it('should send empty message', async () => {
      mockFetchResponse(true, 200, mockMessageResponse);

      await sendMessage(TEST_API_KEY, 'session-123', '');

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            prompt: '',
          }),
        })
      );
    });

    it('should throw error when sending message fails', async () => {
      mockFetchResponse(false, 500, { error: { message: 'Internal server error' } });

      await expect(sendMessage(TEST_API_KEY, 'session-123', 'Hello')).rejects.toThrow(
        'Failed to send message: 500 500'
      );
    });
  });
});
