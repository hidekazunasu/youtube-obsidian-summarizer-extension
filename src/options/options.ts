import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../lib/settings';
import type { ExtensionSettings } from '../lib/types';

const ids: Array<keyof ExtensionSettings> = [
  'outputDestination',
  'openrouterApiKey',
  'openrouterModel',
  'summaryLanguage',
  'summaryCustomInstruction',
  'obsidianVaultName',
  'obsidianFolderPattern',
  'obsidianFilenamePattern',
  'obsidianRestEnabled',
  'obsidianRestBaseUrl',
  'obsidianRestApiKey',
  'notionParentPageId',
  'notionApiToken'
];

const statusEl = document.getElementById('status') as HTMLDivElement;
const destinationEl = document.getElementById('outputDestination') as HTMLSelectElement;
const obsidianFieldsEl = document.getElementById('obsidianFields') as HTMLDivElement;
const notionFieldsEl = document.getElementById('notionFields') as HTMLDivElement;

void initialize();

destinationEl?.addEventListener('change', () => {
  updateDestinationVisibility(destinationEl.value as ExtensionSettings['outputDestination']);
});

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
    const field = document.getElementById(id) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    if (!field) {
      continue;
    }

    if ((id === 'summaryLanguage' || id === 'outputDestination') && field instanceof HTMLSelectElement) {
      ensureSelectHasOption(field, String(settings[id]));
    }

    field.value = String(settings[id]);
  }

  updateDestinationVisibility(settings.outputDestination);
}

function readForm(): ExtensionSettings {
  const result = {} as Record<keyof ExtensionSettings, string | boolean>;

  for (const id of ids) {
    const field = document.getElementById(id) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    if (!field) {
      continue;
    }

    if (id === 'obsidianRestEnabled') {
      result[id] = field.value.toLowerCase() === 'true';
    } else {
      result[id] = field.value;
    }
  }

  return result as ExtensionSettings;
}

function updateDestinationVisibility(destination: ExtensionSettings['outputDestination']): void {
  const showObsidian = destination === 'obsidian';
  obsidianFieldsEl.hidden = !showObsidian;
  notionFieldsEl.hidden = showObsidian;
}

function ensureSelectHasOption(select: HTMLSelectElement, value: string): void {
  if (!value.trim()) {
    return;
  }

  for (const option of Array.from(select.options)) {
    if (option.value === value) {
      return;
    }
  }

  const custom = document.createElement('option');
  custom.value = value;
  custom.textContent = `Custom (${value})`;
  select.appendChild(custom);
}
