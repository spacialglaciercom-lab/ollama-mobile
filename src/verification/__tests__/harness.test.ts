import { createVerificationHarness } from '../harness';
import { useDiagnosticsStore } from '../../store/useDiagnosticsStore';

// Mock useDiagnosticsStore
jest.mock('../../store/useDiagnosticsStore', () => ({
  useDiagnosticsStore: {
    getState: jest.fn(),
  },
}));

describe('createVerificationHarness', () => {
  const mockInfo = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useDiagnosticsStore.getState as jest.Mock).mockReturnValue({
      info: mockInfo,
    });
  });

  it('should run the algorithm and verify the invariant (PASSED)', () => {
    const contract = {
      input: 5,
      expectedOutput: 10,
      invariant: (input: number, output: number) => output === input * 2,
    };
    const algorithm = (n: number) => n * 2;
    const harness = createVerificationHarness('test-harness', contract, algorithm);

    const result = harness.run();

    expect(result).toBe(true);
    expect(mockInfo).toHaveBeenCalledWith(
      'Verification',
      'test-harness: PASSED',
      { name: 'test-harness', isValid: true }
    );
  });

  it('should run the algorithm and verify the invariant (FAILED)', () => {
    const contract = {
      input: 5,
      expectedOutput: 10,
      invariant: (input: number, output: number) => output === input * 2,
    };
    const algorithm = (n: number) => n + 1;
    const harness = createVerificationHarness('test-harness', contract, algorithm);

    const result = harness.run();

    expect(result).toBe(false);
    expect(mockInfo).toHaveBeenCalledWith(
      'Verification',
      'test-harness: FAILED',
      { name: 'test-harness', isValid: false }
    );
  });
});
