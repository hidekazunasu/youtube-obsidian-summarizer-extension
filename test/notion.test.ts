import { describe, expect, it, vi } from 'vitest';
import { saveToNotion } from '../src/lib/notion';
import { baseSettings, sampleSummary, sampleVideo } from './fixtures';

describe('saveToNotion', () => {
  it('creates a Notion page successfully', async () => {
    const fetchImpl = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        text: async () => JSON.stringify({ id: 'page-id' })
      };
    }) as unknown as typeof fetch;

    const result = await saveToNotion(
      {
        path: 'Youtube/My Channel/2026-02-17_title_abc123.md',
        content: '# note\nline 1\nline 2'
      },
      sampleVideo,
      sampleSummary,
      { ...baseSettings, outputDestination: 'notion' },
      { fetchImpl }
    );

    expect(result.status).toBe('notion_saved');
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    const init = (fetchImpl as unknown as { mock: { calls: Array<[string, RequestInit]> } }).mock
      .calls[0][1];
    const body = JSON.parse(String(init.body));
    expect(body.parent.page_id).toBe(baseSettings.notionParentPageId);
    expect(body.properties.title.title[0].text.content).toContain('2026-02-17_title_abc123');
  });

  it('returns failed on notion API error', async () => {
    const fetchImpl = vi.fn(async () => {
      return {
        ok: false,
        status: 403,
        text: async () => 'forbidden'
      };
    }) as unknown as typeof fetch;

    const result = await saveToNotion(
      {
        path: 'Youtube/My Channel/file.md',
        content: '# note'
      },
      sampleVideo,
      sampleSummary,
      { ...baseSettings, outputDestination: 'notion' },
      { fetchImpl }
    );

    expect(result.status).toBe('failed');
    expect(result.message).toContain('Notion API failed (403)');
  });
});
