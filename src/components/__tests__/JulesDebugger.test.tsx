import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Alert } from 'react-native';

import { getSources, createSession } from '../../api/julesApiService';
import JulesDebugger from '../JulesDebugger';

// Mock the API functions
jest.mock('../../api/julesApiService', () => ({
  getSources: jest.fn(),
  createSession: jest.fn(),
}));

const mockGetSources = getSources as jest.MockedFunction<typeof getSources>;
const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>;

// Mock Alert
jest.mock('react-native', () => {
  const actual = jest.requireActual('react-native');
  return {
    ...actual,
    Alert: {
      alert: jest.fn(),
    },
  };
});

const TEST_API_KEY = 'test-api-key-12345';

describe('JulesDebugger Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the component title', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      expect(screen.getByText('Jules AI Debugger')).toBeTruthy();
    });

    it('should render all sections', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      expect(screen.getByText('Configuration')).toBeTruthy();
      expect(screen.getByText('Sources')).toBeTruthy();
      expect(screen.getByText('Create Session')).toBeTruthy();
      expect(screen.getByText('Logs')).toBeTruthy();
    });

    it('should render input fields', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      expect(screen.getByPlaceholderText('main')).toBeTruthy();
      expect(screen.getByPlaceholderText('My Jules Session')).toBeTruthy();
      expect(screen.getByPlaceholderText('What would you like Jules to do?')).toBeTruthy();
    });

    it('should render buttons', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      expect(screen.getByText('Fetch Sources')).toBeTruthy();
      expect(screen.getByText('Create Session')).toBeTruthy();
    });

    it('should show empty state for source selection', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      expect(screen.getByText('Select a source...')).toBeTruthy();
    });

    it('should show empty logs message initially', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      expect(screen.getByText('No logs yet')).toBeTruthy();
    });
  });

  describe('Fetch Sources', () => {
    const mockSources = [
      { id: 'source-1', name: 'repo-1', repositoryUri: 'https://github.com/user/repo-1' },
      { id: 'source-2', name: 'repo-2', repositoryUri: 'https://github.com/user/repo-2' },
    ];

    it('should call getSources when Fetch Sources button is pressed', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      fireEvent.press(screen.getByText('Fetch Sources'));

      await waitFor(() => {
        expect(mockGetSources).toHaveBeenCalledTimes(1);
        expect(mockGetSources).toHaveBeenCalledWith(TEST_API_KEY);
      });
    });

    it('should display sources after successful fetch', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      fireEvent.press(screen.getByText('Fetch Sources'));

      await waitFor(() => {
        expect(screen.getByText('repo-1')).toBeTruthy();
        expect(screen.getByText('repo-2')).toBeTruthy();
      });
    });

    it('should show error alert when getSources fails', async () => {
      const error = new Error('Failed to fetch');
      mockGetSources.mockRejectedValueOnce(error);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      fireEvent.press(screen.getByText('Fetch Sources'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          'Failed to fetch sources: Failed to fetch'
        );
      });
    });

    it('should not call getSources without API key', async () => {
      render(<JulesDebugger apiKey="" />);

      fireEvent.press(screen.getByText('Fetch Sources'));

      await waitFor(() => {
        expect(mockGetSources).not.toHaveBeenCalled();
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please provide a Jules API key');
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

      fireEvent.press(screen.getByText('Fetch Sources'));
      await waitFor(() => {
        expect(screen.getByText('my-repo')).toBeTruthy();
      });

      // Don't select a source
      expect(screen.getByText('Create Session').parent?.props.accessibilityState?.disabled).toBe(
        true
      );
    });

    it('should disable Create Session button when no prompt entered', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      fireEvent.press(screen.getByText('Fetch Sources'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('my-repo'));
      });

      // Don't enter a prompt
      expect(screen.getByText('Create Session').parent?.props.accessibilityState?.disabled).toBe(
        true
      );
    });

    it('should call createSession with correct parameters', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      mockCreateSession.mockResolvedValueOnce(mockSessionResponse);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      // Fetch sources first
      fireEvent.press(screen.getByText('Fetch Sources'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('my-repo'));
      });

      // Enter prompt
      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Fix the bug');

      // Create session
      fireEvent.press(screen.getByText('Create Session'));

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

      fireEvent.press(screen.getByText('Fetch Sources'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('my-repo'));
      });

      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Fix the bug');

      fireEvent.press(screen.getByText('Create Session'));

      await waitFor(() => {
        expect(screen.getByText('Session ID: session-123')).toBeTruthy();
      });
    });

    it('should show error when createSession fails', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      const error = new Error('Session creation failed');
      mockCreateSession.mockRejectedValueOnce(error);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      fireEvent.press(screen.getByText('Fetch Sources'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('my-repo'));
      });

      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Fix the bug');

      fireEvent.press(screen.getByText('Create Session'));

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

    it('should use custom branch when creating session', async () => {
      mockGetSources.mockResolvedValueOnce([
        { id: 'source-1', name: 'my-repo', repositoryUri: 'https://github.com/user/my-repo' },
      ]);
      mockCreateSession.mockResolvedValueOnce({
        session: { id: 'session-123', name: 'sessions/session-123' },
      });

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      // Set custom branch
      const branchInput = screen.getByPlaceholderText('main');
      fireEvent.changeText(branchInput, 'feature-branch');

      fireEvent.press(screen.getByText('Fetch Sources'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('my-repo'));
      });

      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Add feature');

      fireEvent.press(screen.getByText('Create Session'));

      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalledWith(
          TEST_API_KEY,
          'my-repo',
          'Add feature',
          'feature-branch',
          undefined
        );
      });
    });

    it('should use custom title when creating session', async () => {
      mockGetSources.mockResolvedValueOnce([
        { id: 'source-1', name: 'my-repo', repositoryUri: 'https://github.com/user/my-repo' },
      ]);
      mockCreateSession.mockResolvedValueOnce({
        session: { id: 'session-123', name: 'sessions/session-123' },
      });

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      // Set custom title
      const titleInput = screen.getByPlaceholderText('My Jules Session');
      fireEvent.changeText(titleInput, 'My Custom Session');

      fireEvent.press(screen.getByText('Fetch Sources'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('my-repo'));
      });

      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Add feature');

      fireEvent.press(screen.getByText('Create Session'));

      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalledWith(
          TEST_API_KEY,
          'my-repo',
          'Add feature',
          'main',
          'My Custom Session'
        );
      });
    });
  });

  describe('Logs', () => {
    it('should show logs after fetching sources', async () => {
      mockGetSources.mockResolvedValueOnce([
        { id: 'source-1', name: 'my-repo', repositoryUri: 'https://github.com/user/my-repo' },
      ]);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      fireEvent.press(screen.getByText('Fetch Sources'));

      await waitFor(() => {
        expect(screen.getByText(/Fetching sources.../)).toBeTruthy();
        expect(screen.getByText(/Found 1 sources/)).toBeTruthy();
      });
    });

    it('should show error in logs when fetch fails', async () => {
      const error = new Error('Network error');
      mockGetSources.mockRejectedValueOnce(error);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      fireEvent.press(screen.getByText('Fetch Sources'));

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

      fireEvent.press(screen.getByText('Fetch Sources'));
      await waitFor(() => {
        fireEvent.press(screen.getByText('my-repo'));
      });

      const promptInput = screen.getByPlaceholderText('What would you like Jules to do?');
      fireEvent.changeText(promptInput, 'Test prompt');

      fireEvent.press(screen.getByText('Create Session'));

      await waitFor(() => {
        expect(screen.getByText('Session Result')).toBeTruthy();
      });
    });
  });
});
