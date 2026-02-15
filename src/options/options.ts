import {
  clearLastErrorRecord,
  DEFAULT_SETTINGS,
  getLastErrorRecord,
  getSettings,
  saveSettings
} from '../lib/settings';
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
const lastErrorTextEl = document.getElementById('lastErrorText') as HTMLTextAreaElement;

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

document.getElementById('copyLastError')?.addEventListener('click', async () => {
  const text = lastErrorTextEl.value.trim();
  if (!text) {
    statusEl.textContent = 'コピー対象のエラーはありません';
    return;
  }

  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = 'エラーをコピーしました';
  } catch {
    lastErrorTextEl.focus();
    lastErrorTextEl.select();
    statusEl.textContent = 'コピーに失敗しました。手動で選択してコピーしてください';
  }
});

document.getElementById('clearLastError')?.addEventListener('click', async () => {
  await clearLastErrorRecord();
  lastErrorTextEl.value = '';
  statusEl.textContent = 'エラー履歴をクリアしました';
});

async function initialize(): Promise<void> {
  const settings = await getSettings();
  const lastError = await getLastErrorRecord();
  applySettings(settings);
  applyLastError(lastError?.at, lastError?.text);
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

function applyLastError(at?: string, text?: string): void {
  if (!text) {
    lastErrorTextEl.value = '';
    return;
  }
  lastErrorTextEl.value = at ? `[${at}]\n${text}` : text;
}
