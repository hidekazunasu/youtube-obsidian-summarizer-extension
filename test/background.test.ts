import { describe, expect, it, vi } from 'vitest';
import { createActionClickHandler } from '../src/background/service-worker';
import { baseSettings, sampleSummary, sampleVideo } from './fixtures';

describe('background action click flow', () => {
  it('runs collect -> summarize -> save on success', async () => {
    const showAlert = vi.fn(async () => undefined);
    const clearLastErrorRecord = vi.fn(async () => undefined);
    const saveLastErrorRecord = vi.fn(async () => undefined);

    const handler = createActionClickHandler({
      getSettings: vi.fn(async () => baseSettings),
      openOptionsPage: vi.fn(async () => undefined),
      collectVideoData: vi.fn(async () => sampleVideo),
      summarizeVideo: vi.fn(async () => sampleSummary) as any,
      buildNotePayload: vi.fn(() => ({ path: 'Youtube/test.md', content: '# note' })) as any,
      saveToObsidian: vi.fn(async () => ({ status: 'rest_saved' })) as any,
      clearLastErrorRecord,
      saveLastErrorRecord,
      showAlert
    });

    await handler({ id: 1, url: 'https://www.youtube.com/watch?v=abc123' });

    expect(clearLastErrorRecord).toHaveBeenCalledTimes(1);
    expect(saveLastErrorRecord).not.toHaveBeenCalled();
    expect(showAlert).toHaveBeenCalledWith(1, expect.stringContaining('保存完了'));
  });

  it('handles transcript failure path', async () => {
    const showAlert = vi.fn(async () => undefined);
    const saveLastErrorRecord = vi.fn(async () => undefined);

    const handler = createActionClickHandler({
      getSettings: vi.fn(async () => baseSettings),
      openOptionsPage: vi.fn(async () => undefined),
      collectVideoData: vi.fn(async () => {
        throw new Error('字幕が取得できないため保存を中止しました。');
      }),
      showAlert,
      saveLastErrorRecord
    });

    await handler({ id: 1, url: 'https://www.youtube.com/watch?v=abc123' });

    expect(saveLastErrorRecord).toHaveBeenCalledTimes(1);
    expect(showAlert).toHaveBeenCalledWith(1, expect.stringContaining('失敗:'));
  });

  it('handles OpenRouter failure path', async () => {
    const showAlert = vi.fn(async () => undefined);

    const handler = createActionClickHandler({
      getSettings: vi.fn(async () => baseSettings),
      openOptionsPage: vi.fn(async () => undefined),
      collectVideoData: vi.fn(async () => sampleVideo),
      summarizeVideo: vi.fn(async () => {
        throw new Error('OpenRouter API failed (429): rate limit');
      }) as any,
      showAlert,
      saveLastErrorRecord: vi.fn(async () => undefined)
    });

    await handler({ id: 1, url: 'https://www.youtube.com/watch?v=abc123' });

    expect(showAlert).toHaveBeenCalledWith(1, expect.stringContaining('OpenRouter API failed (429)'));
  });

  it('handles URI overflow save failure', async () => {
    const showAlert = vi.fn(async () => undefined);

    const handler = createActionClickHandler({
      getSettings: vi.fn(async () => baseSettings),
      openOptionsPage: vi.fn(async () => undefined),
      collectVideoData: vi.fn(async () => sampleVideo),
      summarizeVideo: vi.fn(async () => sampleSummary) as any,
      buildNotePayload: vi.fn(() => ({ path: 'Youtube/test.md', content: '# note' })) as any,
      saveToObsidian: vi.fn(async () => ({
        status: 'failed',
        message: 'Obsidian URI too long (9000 > 7500).'
      })) as any,
      showAlert,
      saveLastErrorRecord: vi.fn(async () => undefined)
    });

    await handler({ id: 1, url: 'https://www.youtube.com/watch?v=abc123' });

    expect(showAlert).toHaveBeenCalledWith(1, expect.stringContaining('Obsidian URI too long'));
  });
});
