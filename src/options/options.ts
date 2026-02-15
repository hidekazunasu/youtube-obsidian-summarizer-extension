import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../lib/settings';
import type { ExtensionSettings } from '../lib/types';

const ids: Array<keyof ExtensionSettings> = [
  'openrouterApiKey',
  'openrouterModel',
  'summaryLanguage',
  'obsidianVaultName',
  'obsidianFolderPattern',
  'obsidianFilenamePattern',
  'obsidianRestEnabled',
  'obsidianRestBaseUrl',
  'obsidianRestApiKey'
];

const statusEl = document.getElementById('status') as HTMLDivElement;

void initialize();

document.getElementById('save')?.addEventListener('click', async () => {
  const next = readForm();
  await saveSettings(next);
  statusEl.textContent = '保存しました';
});

document.getElementById('reset')?.addEventListener('click', async () => {
  applySettings(DEFAULT_SETTINGS);
  await saveSettings(DEFAULT_SETTINGS);
  statusEl.textContent = 'デフォルトへ戻しました';
});

async function initialize(): Promise<void> {
  const settings = await getSettings();
  applySettings(settings);
}

function applySettings(settings: ExtensionSettings): void {
  for (const id of ids) {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) {
      continue;
    }
    input.value = String(settings[id]);
  }
}

function readForm(): ExtensionSettings {
  const result = {} as Record<keyof ExtensionSettings, string | boolean>;

  for (const id of ids) {
    const input = document.getElementById(id) as HTMLInputElement | null;
    if (!input) {
      continue;
    }

    if (id === 'obsidianRestEnabled') {
      result[id] = input.value.toLowerCase() === 'true';
    } else {
      result[id] = input.value;
    }
  }

  return result as ExtensionSettings;
}
