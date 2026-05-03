import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import JulesDebugger from '../JulesDebugger';

// Mock the API functions
jest.mock('../../api/julesApiService', () => ({
  getSources: jest.fn(),
  createSession: jest.fn(),
}));

import { getSources, createSession } from '../../api/julesApiService';

const mockGetSources = getSources as jest.MockedFunction<typeof getSources>;
const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>;

// Mock Alert
import { Alert } from 'react-native';
jest.spyOn(Alert, 'alert');

const TEST_API_KEY = 'test-api-key-12345';

describe('JulesDebugger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Fetch Sources', () => {
    it('should call getSources with API key when button pressed', async () => {
      mockGetSources.mockResolvedValueOnce([]);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      const fetchButton = screen.getByRole('button', { name: 'Fetch Sources' });
      fireEvent.press(fetchButton);
      
      await waitFor(() => {
        expect(mockGetSources).toHaveBeenCalledTimes(1);
        expect(mockGetSources).toHaveBeenCalledWith(TEST_API_KEY);
      });
    });

    it('should display sources after successful fetch', async () => {
      const mockSources = [
        { id: 'source-1', name: 'my-repo', repositoryUri: 'https://github.com/user/my-repo' },
        { id: 'source-2', name: 'another-repo', repositoryUri: 'https://github.com/user/another-repo' },
      ];
      mockGetSources.mockResolvedValueOnce(mockSources);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'my-repo' })).toBeTruthy();
        expect(screen.getByRole('button', { name: 'another-repo' })).toBeTruthy();
      });
    });

    it('should show error alert when getSources fails', async () => {
      const error = new Error('Failed to fetch');
      mockGetSources.mockRejectedValueOnce(error);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to fetch sources: Failed to fetch'
        );
      });
    });

    it('should not call getSources without API key', async () => {
      render(<JulesDebugger apiKey="" />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      
      await waitFor(() => {
        expect(mockGetSources).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Please provide a Jules API key'
        );
      });
    });
  });

  describe('Create Session', () => {
    const mockSources = [
      { id: 'source-1', name: 'my-repo', repositoryUri: 'https://github.com/user/my-repo' },
    ];
    
    const mockSessionResponse = {
      session: {
        id: 'session-123',
        name: 'sessions/session-123',
        title: 'Test Session',
        state: 'PLAN_PENDING',
      },
    };

    it('should disable Create Session button when no source selected', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'my-repo' })).toBeTruthy();
      });
      
      // Don't select a source
      const createButton = screen.getByRole('button', { name: 'Create Session' });
      expect(createButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should disable Create Session button when no prompt entered', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      await waitFor(() => {
        fireEvent.press(screen.getByRole('button', { name: 'my-repo' }));
      });
      
      // Don't enter a prompt
      const createButton = screen.getByRole('button', { name: 'Create Session' });
      expect(createButton.props.accessibilityState.disabled).toBe(true);
    });

    it('should call createSession with correct parameters', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      mockCreateSession.mockResolvedValueOnce(mockSessionResponse);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      // Fetch sources first
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      await waitFor(() => {
        fireEvent.press(screen.getByRole('button', { name: 'my-repo' }));
      });
      
      // Enter prompt
      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Fix the bug');
      
      // Create session
      fireEvent.press(screen.getByRole('button', { name: 'Create Session' }));
      
      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalledTimes(1);
        expect(mockCreateSession).toHaveBeenCalledWith(
          TEST_API_KEY,
          'my-repo',
          'Fix the bug',
          'main', // default branch
          undefined // no custom title
        );
      });
    });

    it('should display session ID after successful creation', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      mockCreateSession.mockResolvedValueOnce(mockSessionResponse);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      await waitFor(() => {
        fireEvent.press(screen.getByRole('button', { name: 'my-repo' }));
      });
      
      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Fix the bug');
      
      fireEvent.press(screen.getByRole('button', { name: 'Create Session' }));
      
      await waitFor(() => {
        expect(screen.getByText('Session ID: session-123')).toBeTruthy();
      });
    });

    it('should show error when createSession fails', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      const error = new Error('Session creation failed');
      mockCreateSession.mockRejectedValueOnce(error);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      await waitFor(() => {
        fireEvent.press(screen.getByRole('button', { name: 'my-repo' }));
      });
      
      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Fix the bug');
      
      fireEvent.press(screen.getByRole('button', { name: 'Create Session' }));
      
      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to create session: Session creation failed'
        );
      });
    });
  });

  describe('Configuration Inputs', () => {
    it('should update starting branch when changed', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      const branchInput = screen.getByPlaceholderText('main');
      fireEvent.changeText(branchInput, 'feature-branch');
      
      expect(branchInput.props.value).toBe('feature-branch');
    });

    it('should update session title when changed', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      const titleInput = screen.getByPlaceholderText('My Jules Session');
      fireEvent.changeText(titleInput, 'Custom Title');
      
      expect(titleInput.props.value).toBe('Custom Title');
    });
  });

  describe('Logs', () => {
    it('should show logs after fetching sources', async () => {
      mockGetSources.mockResolvedValueOnce([
        { id: 'source-1', name: 'my-repo', repositoryUri: 'https://github.com/user/my-repo' },
      ]);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      
      await waitFor(() => {
        expect(screen.getByText(/Fetching sources.../)).toBeTruthy();
        expect(screen.getByText(/Found 1 sources/)).toBeTruthy();
      });
    });

    it('should show error in logs when fetch fails', async () => {
      const error = new Error('Network error');
      mockGetSources.mockRejectedValueOnce(error);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      
      await waitFor(() => {
        expect(screen.getByText(/Fetching sources.../)).toBeTruthy();
        expect(screen.getByText(/Error fetching sources/)).toBeTruthy();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should not show session result section initially', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      expect(screen.queryByText('Session Result')).toBeNull();
    });

    it('should show session result section after successful creation', async () => {
      mockGetSources.mockResolvedValueOnce([
        { id: 'source-1', name: 'my-repo', repositoryUri: 'https://github.com/user/my-repo' },
      ]);
      mockCreateSession.mockResolvedValueOnce({
        session: { id: 'session-123', name: 'sessions/session-123' },
      });
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByRole('button', { name: 'Fetch Sources' }));
      await waitFor(() => {
        fireEvent.press(screen.getByRole('button', { name: 'my-repo' }));
      });
      
      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Test prompt');
      
      fireEvent.press(screen.getByRole('button', { name: 'Create Session' }));
      
      await waitFor(() => {
        expect(screen.getByText('Session Result')).toBeTruthy();
      });
    });
  });
});
