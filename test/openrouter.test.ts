import { describe, expect, it } from 'vitest';
import { parseSummaryJson } from '../src/lib/openrouter';

describe('parseSummaryJson', () => {
  it('extracts first JSON object from wrapped content', () => {
    const raw = [
      '```json',
      '{',
      '  "summary_lines": ["a", "b", "c"],',
      '  "key_points": ["1", "2", "3", "4", "5"],',
      '  "keywords": ["x", "y", "z"]',
      '}',
      '```'
    ].join('\n');

    const parsed = parseSummaryJson(raw);
    expect(parsed.summary_lines).toHaveLength(3);
    expect(parsed.key_points).toHaveLength(5);
    expect(parsed.keywords).toEqual(['x', 'y', 'z']);
  });
});
