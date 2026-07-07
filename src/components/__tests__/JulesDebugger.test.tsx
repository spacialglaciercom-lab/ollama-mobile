import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { JulesDebugger } from '../JulesDebugger';
import { useJulesSettingsStore } from '../../store/useJulesSettingsStore';
import { useProviderStore } from '../../store/useProviderStore';

// Mock the stores
jest.mock('../../store/useJulesSettingsStore');
jest.mock('../../store/useProviderStore');

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(() => {});

describe('JulesDebugger', () => {
  const mockTestAllConnections = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useJulesSettingsStore as unknown as jest.Mock).mockReturnValue({
      providers: [{ id: 'jules-1', name: 'Jules Provider', isConnected: true }],
      testAllConnections: mockTestAllConnections,
    });

    // Mock the hook to return the state directly
    (useProviderStore as unknown as jest.Mock).mockImplementation((selector) => {
        if (typeof selector === 'function') {
            return selector({
                getActiveProvider: () => ({ name: 'Test Provider', type: 'jules' })
            });
        }
        return {
            getActiveProvider: () => ({ name: 'Test Provider', type: 'jules' })
        };
    });
  });

  it('renders correctly', () => {
    const { getByText } = render(<JulesDebugger />);
    expect(getByText('Jules Debugger')).toBeTruthy();
    expect(getByText('Name: Test Provider')).toBeTruthy();
    expect(getByText('- Jules Provider (Connected)')).toBeTruthy();
  });

  it('calls testAllConnections when button is pressed', async () => {
    mockTestAllConnections.mockResolvedValue({ 'provider-1': true });
    const { getByText } = render(<JulesDebugger />);

    fireEvent.press(getByText('Test Connections'));

    await waitFor(() => {
      expect(mockTestAllConnections).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Connection Test', 'All connections successful');
    });
  });
});
