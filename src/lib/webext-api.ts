type GenericObject = Record<string, unknown>;

type ScriptFunction<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => unknown;

type SendResponse = (payload: unknown) => void;

type RuntimeMessageListener = (
  message: unknown,
  sender: unknown,
  sendResponse: SendResponse
) => boolean | void;

interface BrowserLikeApi {
  runtime: {
    onInstalled: { addListener: (listener: () => void | Promise<void>) => void };
    onMessage: { addListener: (listener: RuntimeMessageListener) => void };
    openOptionsPage: () => Promise<void>;
  };
  storage: {
    sync: {
      get: (key: string) => Promise<GenericObject>;
      set: (values: GenericObject) => Promise<void>;
      remove: (key: string) => Promise<void>;
    };
    local: {
      get: (key: string) => Promise<GenericObject>;
      set: (values: GenericObject) => Promise<void>;
      remove: (key: string) => Promise<void>;
    };
  };
  action: {
    onClicked: {
      addListener: (listener: (tab: { id?: number; url?: string }) => void | Promise<void>) => void;
    };
    setBadgeBackgroundColor: (details: { color: string }) => Promise<void>;
    setBadgeText: (details: { text: string }) => Promise<void>;
    setTitle: (details: { title: string }) => Promise<void>;
  };
  tabs: {
    sendMessage: <TResponse = unknown>(tabId: number, payload: GenericObject) => Promise<TResponse>;
    create: (details: { url: string; active: boolean }) => Promise<void>;
  };
  scripting: {
    executeScript: (details: {
      target: { tabId: number };
      files?: string[];
      func?: (...args: unknown[]) => unknown;
      args?: unknown[];
    }) => Promise<unknown>;
  };
}

interface ChromeLikeApi {
  runtime: {
    lastError?: { message?: string };
    onInstalled: { addListener: (listener: () => void | Promise<void>) => void };
    onMessage: { addListener: (listener: RuntimeMessageListener) => void };
    openOptionsPage: (callback?: () => void) => void;
  };
  storage: {
    sync: {
      get: (key: string, callback: (value: GenericObject) => void) => void;
      set: (values: GenericObject, callback: () => void) => void;
      remove: (key: string, callback: () => void) => void;
    };
    local: {
      get: (key: string, callback: (value: GenericObject) => void) => void;
      set: (values: GenericObject, callback: () => void) => void;
      remove: (key: string, callback: () => void) => void;
    };
  };
  action: {
    onClicked: {
      addListener: (listener: (tab: { id?: number; url?: string }) => void | Promise<void>) => void;
    };
    setBadgeBackgroundColor: (details: { color: string }) => Promise<void> | void;
    setBadgeText: (details: { text: string }) => Promise<void> | void;
    setTitle: (details: { title: string }) => Promise<void> | void;
  };
  tabs: {
    sendMessage: <TResponse = unknown>(
      tabId: number,
      payload: GenericObject,
      callback: (response: TResponse) => void
    ) => void;
    create: (details: { url: string; active: boolean }) => Promise<void> | void;
  };
  scripting: {
    executeScript: (details: {
      target: { tabId: number };
      files?: string[];
      func?: (...args: unknown[]) => unknown;
      args?: unknown[];
    }) => Promise<unknown> | void;
  };
}

const browserApi = (globalThis as { browser?: BrowserLikeApi }).browser;
const chromeApi = (globalThis as unknown as { chrome?: ChromeLikeApi }).chrome;
const isFirefoxStyleApi = typeof browserApi !== 'undefined';
const api: BrowserLikeApi | ChromeLikeApi | undefined = browserApi ?? chromeApi;

function requireApi(): BrowserLikeApi | ChromeLikeApi {
  if (!api) {
    throw new Error('WebExtension API is unavailable in this runtime.');
  }
  return api;
}

function toChromeError(): Error | null {
  const lastError = chromeApi?.runtime.lastError;
  if (!lastError) {
    return null;
  }
  return new Error(lastError.message ?? String(lastError));
}

export function isWebExtAvailable(): boolean {
  return typeof api !== 'undefined';
}

export function onInstalled(listener: () => void | Promise<void>): void {
  requireApi().runtime.onInstalled.addListener(listener);
}

export function onActionClicked(
  listener: (tab: { id?: number; url?: string }) => void | Promise<void>
): void {
  requireApi().action.onClicked.addListener(listener);
}

export function onRuntimeMessage(listener: RuntimeMessageListener): void {
  requireApi().runtime.onMessage.addListener(listener);
}

export async function openOptionsPage(): Promise<void> {
  const currentApi = requireApi();
  if (isFirefoxStyleApi) {
    await (currentApi as BrowserLikeApi).runtime.openOptionsPage();
    return;
  }

  await new Promise<void>((resolve, reject) => {
    (currentApi as ChromeLikeApi).runtime.openOptionsPage(() => {
      const err = toChromeError();
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function storageSyncGet(key: string): Promise<GenericObject> {
  const currentApi = requireApi();
  if (isFirefoxStyleApi) {
    return await (currentApi as BrowserLikeApi).storage.sync.get(key);
  }

  return await new Promise<GenericObject>((resolve, reject) => {
    (currentApi as ChromeLikeApi).storage.sync.get(key, (value) => {
      const err = toChromeError();
      if (err) {
        reject(err);
        return;
      }
      resolve(value);
    });
  });
}

export async function storageSyncSet(values: GenericObject): Promise<void> {
  const currentApi = requireApi();
  if (isFirefoxStyleApi) {
    await (currentApi as BrowserLikeApi).storage.sync.set(values);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    (currentApi as ChromeLikeApi).storage.sync.set(values, () => {
      const err = toChromeError();
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function storageSyncRemove(key: string): Promise<void> {
  const currentApi = requireApi();
  if (isFirefoxStyleApi) {
    await (currentApi as BrowserLikeApi).storage.sync.remove(key);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    (currentApi as ChromeLikeApi).storage.sync.remove(key, () => {
      const err = toChromeError();
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function storageLocalGet(key: string): Promise<GenericObject> {
  const currentApi = requireApi();
  if (isFirefoxStyleApi) {
    return await (currentApi as BrowserLikeApi).storage.local.get(key);
  }

  return await new Promise<GenericObject>((resolve, reject) => {
    (currentApi as ChromeLikeApi).storage.local.get(key, (value) => {
      const err = toChromeError();
      if (err) {
        reject(err);
        return;
      }
      resolve(value);
    });
  });
}

export async function storageLocalSet(values: GenericObject): Promise<void> {
  const currentApi = requireApi();
  if (isFirefoxStyleApi) {
    await (currentApi as BrowserLikeApi).storage.local.set(values);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    (currentApi as ChromeLikeApi).storage.local.set(values, () => {
      const err = toChromeError();
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function storageLocalRemove(key: string): Promise<void> {
  const currentApi = requireApi();
  if (isFirefoxStyleApi) {
    await (currentApi as BrowserLikeApi).storage.local.remove(key);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    (currentApi as ChromeLikeApi).storage.local.remove(key, () => {
      const err = toChromeError();
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function executeScriptFile(tabId: number, file: string): Promise<void> {
  await Promise.resolve(
    requireApi().scripting.executeScript({
      target: { tabId },
      files: [file]
    })
  );
}

export async function executeScriptFunction<TArgs extends unknown[]>(
  tabId: number,
  func: ScriptFunction<TArgs>,
  args: TArgs
): Promise<void> {
  await Promise.resolve(
    requireApi().scripting.executeScript({
      target: { tabId },
      func: func as (...args: unknown[]) => unknown,
      args
    })
  );
}

export async function tabsSendMessage<TResponse>(
  tabId: number,
  payload: GenericObject
): Promise<TResponse> {
  const currentApi = requireApi();
  if (isFirefoxStyleApi) {
    return await (currentApi as BrowserLikeApi).tabs.sendMessage<TResponse>(tabId, payload);
  }

  return await new Promise<TResponse>((resolve, reject) => {
    (currentApi as ChromeLikeApi).tabs.sendMessage<TResponse>(tabId, payload, (response) => {
      const err = toChromeError();
      if (err) {
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

export async function tabsCreate(url: string, active = false): Promise<void> {
  await Promise.resolve(requireApi().tabs.create({ url, active }));
}

export async function actionSetBadgeBackgroundColor(color: string): Promise<void> {
  await Promise.resolve(requireApi().action.setBadgeBackgroundColor({ color }));
}

export async function actionSetBadgeText(text: string): Promise<void> {
  await Promise.resolve(requireApi().action.setBadgeText({ text }));
}

export async function actionSetTitle(title: string): Promise<void> {
  await Promise.resolve(requireApi().action.setTitle({ title }));
}
