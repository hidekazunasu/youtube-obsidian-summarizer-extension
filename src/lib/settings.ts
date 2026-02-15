import type { ExtensionSettings } from './types';

const SETTINGS_KEY = 'settings';
const LAST_ERROR_KEY = 'last_error_record';

export interface LastErrorRecord {
  at: string;
  text: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  openrouterApiKey: '',
  openrouterModel: 'mistralai/mistral-small-3.1-24b-instruct:free',
  obsidianVaultName: '',
  obsidianFolderPattern: 'Youtube/{channel}',
  obsidianFilenamePattern: '{yyyy-mm-dd}_{title}_{videoId}.md',
  obsidianRestEnabled: true,
  obsidianRestBaseUrl: 'http://127.0.0.1:27123',
  obsidianRestApiKey: '',
  summaryLanguage: 'ja'
};

export async function getSettings(): Promise<ExtensionSettings> {
  const stored = await chrome.storage.sync.get(SETTINGS_KEY);
  const raw = stored[SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;
  return {
    ...DEFAULT_SETTINGS,
    ...(raw ?? {})
  };
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  await chrome.storage.sync.set({
    [SETTINGS_KEY]: settings
  });
}

export function mergeWithDefaults(
  partial: Partial<ExtensionSettings>
): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial
  };
}

export async function getLastErrorRecord(): Promise<LastErrorRecord | null> {
  const stored = await chrome.storage.local.get(LAST_ERROR_KEY);
  const raw = stored[LAST_ERROR_KEY] as LastErrorRecord | undefined;
  if (!raw?.text) {
    return null;
  }
  return raw;
}

export async function saveLastErrorRecord(text: string): Promise<void> {
  const record: LastErrorRecord = {
    at: new Date().toISOString(),
    text
  };
  await chrome.storage.local.set({
    [LAST_ERROR_KEY]: record
  });
}

export async function clearLastErrorRecord(): Promise<void> {
  await chrome.storage.local.remove(LAST_ERROR_KEY);
}
