import { describe, expect, it, vi } from 'vitest';
import { buildNote, buildNotePayload } from '../src/lib/note';
import { baseSettings, sampleSummary, sampleVideo } from './fixtures';

describe('buildNote', () => {
  it('renders frontmatter and body sections', () => {
    const note = buildNote(sampleVideo, sampleSummary);
    expect(note).toContain('source: youtube');
    expect(note).toContain('## Summary');
    expect(note).toContain('## Key Points');
    expect(note).toContain('## Keywords');
  });
});

describe('buildNotePayload', () => {
  it('applies folder/filename patterns and sanitization', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T10:00:00.000Z'));
    const payload = buildNotePayload(sampleVideo, sampleSummary, baseSettings);
    expect(payload.path).toBe('Youtube/My Channel/2026-02-15_Test- Video-Title-_abc123.md');
    vi.useRealTimers();
  });
});
