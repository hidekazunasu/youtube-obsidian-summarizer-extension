import { describe, expect, it, vi } from 'vitest';
import { buildNote, buildNotePayload } from '../src/lib/note';
import { baseSettings, sampleSummary, sampleVideo } from './fixtures';

describe('buildNote', () => {
  it('renders frontmatter and body sections', () => {
    const fixed = new Date('2026-02-15T10:00:00.000Z');
    const note = buildNote(sampleVideo, sampleSummary, fixed);
    expect(note).toContain('source: youtube');
    expect(note).toContain('saved_at: "2026-02-15T10:00:00.000Z"');
    expect(note).not.toContain('\ntags:\n');
    expect(note).toContain('# Tag');
    expect(note).toContain('#youtube');
    expect(note).toContain('#youtube/my-channel');
    expect(note).toContain('#topic/llm');
    expect(note).toContain('#topic/openai');
    expect(note).toContain('#a');
    expect(note).toContain('## Summary');
    expect(note).toContain('## Key Points');
    expect(note).toContain('## Keywords');
  });

  it('escapes yaml-sensitive characters', () => {
    const fixed = new Date('2026-02-15T10:00:00.000Z');
    const note = buildNote(
      {
        ...sampleVideo,
        title: 'A:B #C [D] {E} "F" \\ G\nH\rI'
      },
      sampleSummary,
      fixed
    );

    expect(note).toContain('title: "A:B #C [D] {E} \\"F\\" \\\\ G\\nH\\rI"');
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
