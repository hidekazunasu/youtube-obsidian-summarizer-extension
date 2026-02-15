import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.resetModules();
  delete (globalThis as any).browser;
  delete (globalThis as any).chrome;
});

describe('webext-api wrapper', () => {
  it('supports Promise-style browser.storage.sync.get', async () => {
    (globalThis as any).browser = {
      storage: {
        sync: {
          get: vi.fn(async () => ({ settings: { summaryLanguage: 'ja' } })),
          set: vi.fn(async () => undefined)
        },
        local: {
          get: vi.fn(async () => ({})),
          set: vi.fn(async () => undefined),
          remove: vi.fn(async () => undefined)
        }
      },
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() },
        openOptionsPage: vi.fn(async () => undefined)
      },
      action: {
        onClicked: { addListener: vi.fn() },
        setBadgeBackgroundColor: vi.fn(async () => undefined),
        setBadgeText: vi.fn(async () => undefined),
        setTitle: vi.fn(async () => undefined)
      },
      tabs: {
        sendMessage: vi.fn(async () => ({ ok: true })),
        create: vi.fn(async () => undefined)
      },
      scripting: {
        executeScript: vi.fn(async () => undefined)
      }
    };

    const mod = await import('../src/lib/webext-api');
    const value = await mod.storageSyncGet('settings');
    expect((value as any).settings.summaryLanguage).toBe('ja');
  });

  it('supports callback-style chrome.tabs.sendMessage', async () => {
    (globalThis as any).chrome = {
      runtime: {
        lastError: null,
        onInstalled: { addListener: vi.fn() },
        onMessage: { addListener: vi.fn() },
        openOptionsPage: vi.fn()
      },
      storage: {
        sync: {
          get: vi.fn((_key: string, cb: (v: any) => void) => cb({})),
          set: vi.fn((_v: any, cb: () => void) => cb())
        },
        local: {
          get: vi.fn((_key: string, cb: (v: any) => void) => cb({})),
          set: vi.fn((_v: any, cb: () => void) => cb()),
          remove: vi.fn((_key: string, cb: () => void) => cb())
        }
      },
      action: {
        onClicked: { addListener: vi.fn() },
        setBadgeBackgroundColor: vi.fn(async () => undefined),
        setBadgeText: vi.fn(async () => undefined),
        setTitle: vi.fn(async () => undefined)
      },
      tabs: {
        sendMessage: vi.fn((_tabId: number, _payload: any, cb: (v: any) => void) =>
          cb({ ok: true, data: { value: 1 } })
        ),
        create: vi.fn(async () => undefined)
      },
      scripting: {
        executeScript: vi.fn(async () => undefined)
      }
    };

    const mod = await import('../src/lib/webext-api');
    const response = await mod.tabsSendMessage<{ ok: boolean; data: { value: number } }>(1, {
      type: 'PING'
    });

    expect(response.ok).toBe(true);
    expect(response.data.value).toBe(1);
  });
});
