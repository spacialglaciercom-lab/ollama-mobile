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
jest.spyOn(Alert, 'alert');

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
      // There's both a section title and a button with this text
      expect(screen.getAllByText('Create Session').length).toBeGreaterThan(0);
      expect(screen.getByText('Logs')).toBeTruthy();
    });
  });

  describe('Source Fetching', () => {
    it('should show error alert if API key is missing', () => {
      render(<JulesDebugger apiKey="" />);

      const fetchButton = screen.getByText('Fetch Sources');
      fireEvent.press(fetchButton);

      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please provide a Jules API key');
    });

    it('should fetch and display sources successfully', async () => {
      const mockSources = [
        { id: 'src-1', name: 'repo-1' },
        { id: 'src-2', name: 'repo-2' },
      ];
      mockGetSources.mockResolvedValueOnce(mockSources as any);

      render(<JulesDebugger apiKey={TEST_API_KEY} />);

      const fetchButton = screen.getByText('Fetch Sources');
      fireEvent.press(fetchButton);

      await waitFor(() => {
        expect(mockGetSources).toHaveBeenCalledWith(TEST_API_KEY);
      });

      expect(screen.getByText('repo-1')).toBeTruthy();
      expect(screen.getByText('repo-2')).toBeTruthy();
    });
  });
});
