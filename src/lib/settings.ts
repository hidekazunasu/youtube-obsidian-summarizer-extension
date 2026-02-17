import type { ExtensionSettings } from './types';
import {
  storageLocalGet,
  storageLocalRemove,
  storageLocalSet,
  storageSyncGet,
  storageSyncRemove,
  storageSyncSet
} from './webext-api';

const SETTINGS_PUBLIC_KEY = 'settings_public';
const SETTINGS_SECRETS_KEY = 'settings_secrets';
const LEGACY_SETTINGS_KEY = 'settings';
const LAST_ERROR_KEY = 'last_error_record';

type SecretKey = 'openrouterApiKey' | 'obsidianRestApiKey' | 'notionApiToken';
type SettingsSecrets = Pick<ExtensionSettings, SecretKey>;
type SettingsPublic = Omit<ExtensionSettings, SecretKey>;

export interface LastErrorRecord {
  at: string;
  text: string;
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  openrouterApiKey: '',
  openrouterModel: 'mistralai/mistral-small-3.1-24b-instruct:free',
  outputDestination: 'obsidian',
  summaryCustomInstruction: '',
  obsidianVaultName: '',
  obsidianFolderPattern: 'Youtube/{channel}',
  obsidianFilenamePattern: '{yyyy-mm-dd}_{title}_{videoId}.md',
  obsidianRestEnabled: true,
  obsidianRestBaseUrl: 'http://127.0.0.1:27123',
  obsidianRestApiKey: '',
  notionParentPageId: '',
  notionApiToken: '',
  summaryLanguage: 'ja'
};

export async function getSettings(): Promise<ExtensionSettings> {
  const [publicStored, secretStored, legacyStored] = await Promise.all([
    storageSyncGet(SETTINGS_PUBLIC_KEY),
    storageLocalGet(SETTINGS_SECRETS_KEY),
    storageSyncGet(LEGACY_SETTINGS_KEY)
  ]);

  const publicRaw = publicStored[SETTINGS_PUBLIC_KEY] as Partial<SettingsPublic> | undefined;
  const secretRaw = secretStored[SETTINGS_SECRETS_KEY] as Partial<SettingsSecrets> | undefined;
  const legacyRaw = legacyStored[LEGACY_SETTINGS_KEY] as Partial<ExtensionSettings> | undefined;

  const merged: ExtensionSettings = {
    ...DEFAULT_SETTINGS,
    ...(legacyRaw ?? {}),
    ...(publicRaw ?? {}),
    ...(secretRaw ?? {})
  };

  if (legacyRaw) {
    await migrateLegacySettings(legacyRaw, publicRaw, secretRaw);
  }

  return merged;
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
  const publicPart = pickPublicSettings(settings);
  const secretPart = pickSecretSettings(settings);

  await Promise.all([
    storageSyncSet({ [SETTINGS_PUBLIC_KEY]: publicPart }),
    storageLocalSet({ [SETTINGS_SECRETS_KEY]: secretPart }),
    storageSyncRemove(LEGACY_SETTINGS_KEY)
  ]);
}

export function mergeWithDefaults(partial: Partial<ExtensionSettings>): ExtensionSettings {
  return {
    ...DEFAULT_SETTINGS,
    ...partial
  };
}

export async function getLastErrorRecord(): Promise<LastErrorRecord | null> {
  const stored = await storageLocalGet(LAST_ERROR_KEY);
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
  await storageLocalSet({
    [LAST_ERROR_KEY]: record
  });
}

export async function clearLastErrorRecord(): Promise<void> {
  await storageLocalRemove(LAST_ERROR_KEY);
}

async function migrateLegacySettings(
  legacyRaw: Partial<ExtensionSettings>,
  currentPublic: Partial<SettingsPublic> | undefined,
  currentSecrets: Partial<SettingsSecrets> | undefined
): Promise<void> {
  const migratedPublic: SettingsPublic = {
    ...pickPublicSettings(DEFAULT_SETTINGS),
    ...pickPublicSettings(legacyRaw),
    ...(currentPublic ?? {})
  };

  const migratedSecrets: SettingsSecrets = {
    ...pickSecretSettings(DEFAULT_SETTINGS),
    ...pickSecretSettings(legacyRaw),
    ...(currentSecrets ?? {})
  };

  await Promise.all([
    storageSyncSet({ [SETTINGS_PUBLIC_KEY]: migratedPublic }),
    storageLocalSet({ [SETTINGS_SECRETS_KEY]: migratedSecrets }),
    storageSyncRemove(LEGACY_SETTINGS_KEY)
  ]);
}

function pickPublicSettings(input: Partial<ExtensionSettings>): SettingsPublic {
  return {
    openrouterModel: input.openrouterModel ?? DEFAULT_SETTINGS.openrouterModel,
    outputDestination: input.outputDestination ?? DEFAULT_SETTINGS.outputDestination,
    summaryCustomInstruction:
      input.summaryCustomInstruction ?? DEFAULT_SETTINGS.summaryCustomInstruction,
    obsidianVaultName: input.obsidianVaultName ?? DEFAULT_SETTINGS.obsidianVaultName,
    obsidianFolderPattern:
      input.obsidianFolderPattern ?? DEFAULT_SETTINGS.obsidianFolderPattern,
    obsidianFilenamePattern:
      input.obsidianFilenamePattern ?? DEFAULT_SETTINGS.obsidianFilenamePattern,
    obsidianRestEnabled: input.obsidianRestEnabled ?? DEFAULT_SETTINGS.obsidianRestEnabled,
    obsidianRestBaseUrl: input.obsidianRestBaseUrl ?? DEFAULT_SETTINGS.obsidianRestBaseUrl,
    notionParentPageId: input.notionParentPageId ?? DEFAULT_SETTINGS.notionParentPageId,
    summaryLanguage: input.summaryLanguage ?? DEFAULT_SETTINGS.summaryLanguage
  };
}

function pickSecretSettings(input: Partial<ExtensionSettings>): SettingsSecrets {
  return {
    openrouterApiKey: input.openrouterApiKey ?? '',
    obsidianRestApiKey: input.obsidianRestApiKey ?? '',
    notionApiToken: input.notionApiToken ?? ''
  };
}
