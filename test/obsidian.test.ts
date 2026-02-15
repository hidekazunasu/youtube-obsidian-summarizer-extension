import { describe, expect, it, vi } from 'vitest';
import { saveToObsidian } from '../src/lib/obsidian';
import { baseSettings } from './fixtures';

describe('saveToObsidian', () => {
  it('falls back to URI when REST fails', async () => {
    const openUri = vi.fn(async () => {});
    const fetchImpl: typeof fetch = vi.fn(async () => {
      return new Response('down', { status: 500 });
    }) as unknown as typeof fetch;

    const result = await saveToObsidian(
      {
        path: 'Youtube/Channel/file.md',
        content: '# note'
      },
      baseSettings,
      { fetchImpl, openUri }
    );

    expect(result.status).toBe('uri_fallback_saved');
    expect(openUri).toHaveBeenCalledTimes(1);
  });
});
