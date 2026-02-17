import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExtensionSettings } from '../src/lib/types';

interface MockState {
  sync: Record<string, unknown>;
  local: Record<string, unknown>;
}

afterEach(() => {
  vi.resetModules();
  vi.doUnmock('../src/lib/webext-api');
});

describe('settings storage split', () => {
  it('saves public settings to sync and secrets to local', async () => {
    const state: MockState = { sync: {}, local: {} };

    vi.doMock('../src/lib/webext-api', () => ({
      storageSyncGet: vi.fn(async (key: string) => ({ [key]: state.sync[key] })),
      storageLocalGet: vi.fn(async (key: string) => ({ [key]: state.local[key] })),
      storageSyncSet: vi.fn(async (values: Record<string, unknown>) => {
        Object.assign(state.sync, values);
      }),
      storageLocalSet: vi.fn(async (values: Record<string, unknown>) => {
        Object.assign(state.local, values);
      }),
      storageSyncRemove: vi.fn(async (key: string) => {
        delete state.sync[key];
      }),
      storageLocalRemove: vi.fn(async (key: string) => {
        delete state.local[key];
      })
    }));

    const mod = await import('../src/lib/settings');
    const settings: ExtensionSettings = {
      ...mod.DEFAULT_SETTINGS,
      outputDestination: 'notion',
      summaryCustomInstruction: '料理動画ではレシピ重視',
      notionParentPageId: 'page-123',
      notionApiToken: 'ntn-secret',
      openrouterApiKey: 'or-secret',
      obsidianRestApiKey: 'obs-secret'
    };

    await mod.saveSettings(settings);

    const publicPart = state.sync.settings_public as Record<string, unknown>;
    const secretPart = state.local.settings_secrets as Record<string, unknown>;

    expect(publicPart.outputDestination).toBe('notion');
    expect(publicPart.summaryCustomInstruction).toBe('料理動画ではレシピ重視');
    expect(publicPart.notionParentPageId).toBe('page-123');
    expect(secretPart.notionApiToken).toBe('ntn-secret');
    expect(secretPart.openrouterApiKey).toBe('or-secret');
    expect(secretPart.obsidianRestApiKey).toBe('obs-secret');
  });

  it('migrates legacy settings into split storage including notion fields', async () => {
    const state: MockState = {
      sync: {
        settings: {
          openrouterApiKey: 'legacy-or',
          obsidianRestApiKey: 'legacy-obs',
          outputDestination: 'notion',
          summaryCustomInstruction: 'legacy custom',
          notionParentPageId: 'legacy-parent',
          notionApiToken: 'legacy-notion-token',
          summaryLanguage: 'ja'
        }
      },
      local: {}
    };

    vi.doMock('../src/lib/webext-api', () => ({
      storageSyncGet: vi.fn(async (key: string) => ({ [key]: state.sync[key] })),
      storageLocalGet: vi.fn(async (key: string) => ({ [key]: state.local[key] })),
      storageSyncSet: vi.fn(async (values: Record<string, unknown>) => {
        Object.assign(state.sync, values);
      }),
      storageLocalSet: vi.fn(async (values: Record<string, unknown>) => {
        Object.assign(state.local, values);
      }),
      storageSyncRemove: vi.fn(async (key: string) => {
        delete state.sync[key];
      }),
      storageLocalRemove: vi.fn(async (key: string) => {
        delete state.local[key];
      })
    }));

    const mod = await import('../src/lib/settings');
    const loaded = await mod.getSettings();

    expect(loaded.outputDestination).toBe('notion');
    expect(loaded.summaryCustomInstruction).toBe('legacy custom');
    expect(loaded.notionParentPageId).toBe('legacy-parent');
    expect(loaded.notionApiToken).toBe('legacy-notion-token');

    expect(state.sync.settings).toBeUndefined();
    const migratedPublic = state.sync.settings_public as Record<string, unknown>;
    const migratedSecrets = state.local.settings_secrets as Record<string, unknown>;
    expect(migratedPublic.outputDestination).toBe('notion');
    expect(migratedSecrets.notionApiToken).toBe('legacy-notion-token');
  });
});
