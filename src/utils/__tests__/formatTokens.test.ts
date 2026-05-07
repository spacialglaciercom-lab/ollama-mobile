import { formatTokens, formatDuration, formatModelSize } from '../formatTokens';

describe('formatTokens', () => {
  it('should return the count as a string for values less than 1,000', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(999)).toBe('999');
  });

  it('should format values in K for values between 1,000 and 999,999', () => {
    expect(formatTokens(1000)).toBe('1.0K');
    expect(formatTokens(1500)).toBe('1.5K');
    expect(formatTokens(10000)).toBe('10.0K');
    expect(formatTokens(999900)).toBe('999.9K');
  });

  it('should format values in M for values 1,000,000 and above', () => {
    expect(formatTokens(1000000)).toBe('1.0M');
    expect(formatTokens(1500000)).toBe('1.5M');
    expect(formatTokens(10000000)).toBe('10.0M');
  });
});

describe('formatDuration', () => {
  it('should format duration in ms for values less than 1,000ms (1,000,000,000ns)', () => {
    expect(formatDuration(0)).toBe('0ms');
    expect(formatDuration(1000000)).toBe('1ms');
    expect(formatDuration(500000000)).toBe('500ms');
    expect(formatDuration(999499999)).toBe('999ms');
  });

  it('should format duration in s for values 1,000ms and above', () => {
    expect(formatDuration(1000000000)).toBe('1.0s');
    expect(formatDuration(1500000000)).toBe('1.5s');
    expect(formatDuration(60000000000)).toBe('60.0s');
  });
});

describe('formatModelSize', () => {
  it('should format size in B for values less than 1MB (1,000,000 bytes)', () => {
    expect(formatModelSize(0)).toBe('0B');
    expect(formatModelSize(500)).toBe('500B');
    expect(formatModelSize(999999)).toBe('999999B');
  });

  it('should format size in MB for values between 1MB and 999MB', () => {
    expect(formatModelSize(1000000)).toBe('1.0MB');
    expect(formatModelSize(1500000)).toBe('1.5MB');
    expect(formatModelSize(999000000)).toBe('999.0MB');
  });

  it('should format size in GB for values between 1GB and 999GB', () => {
    expect(formatModelSize(1000000000)).toBe('1.0GB');
    expect(formatModelSize(1500000000)).toBe('1.5GB');
    expect(formatModelSize(999000000000)).toBe('999.0GB');
  });

  it('should format size in TB for values 1TB and above', () => {
    expect(formatModelSize(1000000000000)).toBe('1.0TB');
    expect(formatModelSize(1500000000000)).toBe('1.5TB');
  });
});
