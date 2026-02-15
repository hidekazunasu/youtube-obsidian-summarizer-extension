import { describe, expect, it } from 'vitest';
import { sanitizePathSegment } from '../src/lib/utils';

describe('sanitizePathSegment', () => {
  it('removes path-invalid characters', () => {
    expect(sanitizePathSegment('A:/B*?"<>|C')).toBe('A--B-----C');
  });

  it('falls back to untitled for blank strings', () => {
    expect(sanitizePathSegment('   ')).toBe('untitled');
  });
});
