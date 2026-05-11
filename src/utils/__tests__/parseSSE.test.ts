import { parseSSELine, parseSSEBuffer } from '../parseSSE';

describe('parseSSELine', () => {
  it('parses valid JSON', () => {
    expect(parseSSELine('{"key": "value"}')).toEqual({ key: 'value' });
  });

  it('returns null for invalid JSON', () => {
    expect(parseSSELine('{"key": "value"')).toBeNull();
  });

  it('returns null for empty strings', () => {
    expect(parseSSELine('')).toBeNull();
  });

  it('returns null for whitespace', () => {
    expect(parseSSELine('   \n  ')).toBeNull();
  });
});

describe('parseSSEBuffer', () => {
  it('handles empty string', () => {
    expect(parseSSEBuffer('')).toEqual({ objects: [], remaining: '' });
  });

  it('handles a single partial line', () => {
    expect(parseSSEBuffer('{"key": "val')).toEqual({ objects: [], remaining: '{"key": "val' });
  });

  it('handles a single complete line', () => {
    expect(parseSSEBuffer('{"key": "value"}\n')).toEqual({ objects: [{ key: 'value' }], remaining: '' });
  });

  it('handles multiple complete lines', () => {
    const buffer = '{"a": 1}\n{"b": 2}\n';
    expect(parseSSEBuffer(buffer)).toEqual({
      objects: [{ a: 1 }, { b: 2 }],
      remaining: '',
    });
  });

  it('handles multiple complete lines with a trailing partial line', () => {
    const buffer = '{"a": 1}\n{"b": 2}\n{"c": ';
    expect(parseSSEBuffer(buffer)).toEqual({
      objects: [{ a: 1 }, { b: 2 }],
      remaining: '{"c": ',
    });
  });

  it('ignores invalid lines within the buffer', () => {
    const buffer = '{"a": 1}\ninvalid json\n{"b": 2}\n';
    expect(parseSSEBuffer(buffer)).toEqual({
      objects: [{ a: 1 }, { b: 2 }],
      remaining: '',
    });
  });
});
