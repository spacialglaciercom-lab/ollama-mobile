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
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

import { Alert } from 'react-native';

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

    it('should render input fields', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      expect(screen.getByPlaceholderText('main')).toBeTruthy();
      expect(screen.getByPlaceholderText('My Jules Session')).toBeTruthy();
      expect(screen.getByPlaceholderText('What would you like Jules to do?')).toBeTruthy();
    });

    it('should render buttons', () => {
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      expect(screen.getByTestId('fetch-sources-button')).toBeTruthy();
      expect(screen.getByTestId('create-session-button')).toBeTruthy();
    });
  });

  describe('Fetch Sources', () => {
    const mockSources = [
      { id: 'source-1', name: 'my-repo', repositoryUri: 'https://github.com/user/my-repo' },
    ];

    it('should call getSources when Fetch Sources is pressed', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByTestId('fetch-sources-button'));
      
      await waitFor(() => {
        expect(mockGetSources).toHaveBeenCalledWith(TEST_API_KEY);
      });
    });

    it('should display fetched sources', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      fireEvent.press(screen.getByTestId('fetch-sources-button'));
      
      await waitFor(() => {
        expect(screen.getByText('my-repo')).toBeTruthy();
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

    it('should call createSession with correct parameters', async () => {
      mockGetSources.mockResolvedValueOnce(mockSources);
      mockCreateSession.mockResolvedValueOnce(mockSessionResponse);
      
      render(<JulesDebugger apiKey={TEST_API_KEY} />);
      
      // Fetch sources
      fireEvent.press(screen.getByTestId('fetch-sources-button'));
      await waitFor(() => screen.getByText('my-repo'));

      // Select source
      fireEvent.press(screen.getByTestId('source-item-my-repo'));
      
      // Enter prompt
      fireEvent.changeText(screen.getByTestId('prompt-input'), 'Fix the bug');
      
      // Create session
      fireEvent.press(screen.getByTestId('create-session-button'));
      
      await waitFor(() => {
        expect(mockCreateSession).toHaveBeenCalledWith(
          TEST_API_KEY,
          'my-repo',
          'Fix the bug',
          'main',
          undefined
        );
      });
    });
  });
});
