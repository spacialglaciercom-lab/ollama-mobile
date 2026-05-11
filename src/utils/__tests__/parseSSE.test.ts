import { parseSSELine, parseSSEBuffer } from '../parseSSE';

describe('parseSSELine', () => {
  it('should parse valid JSON', () => {
    expect(parseSSELine('{"test": 1}')).toEqual({ test: 1 });
  });

  it('should return null for empty string', () => {
    expect(parseSSELine('')).toBeNull();
  });

  it('should return null for whitespace', () => {
    expect(parseSSELine('   \t\n')).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    expect(parseSSELine('{"test": ')).toBeNull();
  });
});

describe('parseSSEBuffer', () => {
  it('should parse a complete JSON string', () => {
    const { objects, remaining } = parseSSEBuffer('{"test": 1}\n');
    expect(objects).toEqual([{ test: 1 }]);
    expect(remaining).toBe('');
  });

  it('should handle multiple JSON strings', () => {
    const { objects, remaining } = parseSSEBuffer('{"test": 1}\n{"test": 2}\n');
    expect(objects).toEqual([{ test: 1 }, { test: 2 }]);
    expect(remaining).toBe('');
  });

  it('should keep partial lines in remaining', () => {
    const { objects, remaining } = parseSSEBuffer('{"test": 1}\n{"test": ');
    expect(objects).toEqual([{ test: 1 }]);
    expect(remaining).toBe('{"test": ');
  });

  it('should handle just a partial line', () => {
    const { objects, remaining } = parseSSEBuffer('{"test": ');
    expect(objects).toEqual([]);
    expect(remaining).toBe('{"test": ');
  });

  it('should ignore invalid JSON lines that are not the last line', () => {
    const { objects, remaining } = parseSSEBuffer('{"test": 1}\ninvalid json\n{"test": 2}\n');
    expect(objects).toEqual([{ test: 1 }, { test: 2 }]);
    expect(remaining).toBe('');
  });
});
