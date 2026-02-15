import type { ExtensionSettings, SummaryResult, VideoData } from '../src/lib/types';

export const baseSettings: ExtensionSettings = {
  openrouterApiKey: 'sk-test',
  openrouterModel: 'test/model:free',
  obsidianVaultName: 'MainVault',
  obsidianFolderPattern: 'Youtube/{channel}',
  obsidianFilenamePattern: '{yyyy-mm-dd}_{title}_{videoId}.md',
  obsidianRestEnabled: true,
  obsidianRestBaseUrl: 'http://127.0.0.1:27123',
  obsidianRestApiKey: 'obsidian-key',
  summaryLanguage: 'ja'
};

export const sampleVideo: VideoData = {
  videoId: 'abc123',
  title: 'Test: Video/Title?',
  channel: 'My Channel',
  url: 'https://www.youtube.com/watch?v=abc123',
  transcriptText: 'First line\nSecond line'
};

export const sampleSummary: SummaryResult = {
  summaryLines: ['Summary line 1', 'Summary line 2', 'Summary line 3'],
  keyPoints: ['Point 1', 'Point 2', 'Point 3', 'Point 4', 'Point 5'],
  keywords: ['A', 'B', 'C'],
  model: 'test/model:free'
};
