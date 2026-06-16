import { checkServerStatus } from '../ollamaClient';

// Mock the global fetch function
global.fetch = jest.fn();

describe('ollamaClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkServerStatus', () => {
    const TEST_URL = 'http://localhost:11434';
    const TEST_API_KEY = 'test-api-key';

    it('should return status true and model names on successful fetch', async () => {
      const mockResponse = {
        models: [{ name: 'llama2' }, { name: 'mistral' }],
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce(mockResponse),
      });

      const result = await checkServerStatus(TEST_URL);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(`${TEST_URL}/api/tags`, {
        method: 'GET',
        headers: undefined,
      });
      expect(result).toEqual({
        status: true,
        models: ['llama2', 'mistral'],
      });
    });

    it('should include Authorization header when apiKey is provided', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({ models: [] }),
      });

      await checkServerStatus(TEST_URL, TEST_API_KEY);

      expect(fetch).toHaveBeenCalledWith(`${TEST_URL}/api/tags`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${TEST_API_KEY}` },
      });
    });

    it('should handle undefined models array gracefully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValueOnce({}),
      });

      const result = await checkServerStatus(TEST_URL);

      expect(result).toEqual({
        status: true,
        models: undefined,
      });
    });

    it('should return status false when fetch response is not ok', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
      });

      const result = await checkServerStatus(TEST_URL);

      expect(result).toEqual({
        status: false,
      });
    });

    it('should return status false when network request fails', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await checkServerStatus(TEST_URL);

      expect(result).toEqual({
        status: false,
      });
    });
  });
});
