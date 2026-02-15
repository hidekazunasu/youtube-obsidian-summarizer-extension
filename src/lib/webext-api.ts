type GenericObject = Record<string, unknown>;

type ScriptFunction<TArgs extends unknown[] = unknown[]> = (...args: TArgs) => unknown;

const globalAny = globalThis as any;
const isFirefoxStyleApi = typeof globalAny.browser !== 'undefined';
const api = (globalAny.browser ?? globalAny.chrome) as any;

function toError(): Error | null {
  const runtime = globalAny.chrome?.runtime;
  const lastError = runtime?.lastError;
  if (!lastError) {
    return null;
  }
  return new Error(lastError.message ?? String(lastError));
}

export function getApi(): any {
  return api;
}

export function onInstalled(listener: () => void | Promise<void>): void {
  api.runtime.onInstalled.addListener(listener);
}

export function onActionClicked(
  listener: (tab: { id?: number; url?: string }) => void | Promise<void>
): void {
  api.action.onClicked.addListener(listener);
}

export function onRuntimeMessage(
  listener: (
    message: unknown,
    sender: unknown,
    sendResponse: (payload: unknown) => void
  ) => boolean | void
): void {
  api.runtime.onMessage.addListener(listener);
}

export async function openOptionsPage(): Promise<void> {
  await Promise.resolve(api.runtime.openOptionsPage());
}

export async function storageSyncGet(key: string): Promise<GenericObject> {
  if (isFirefoxStyleApi) {
    return (await api.storage.sync.get(key)) as GenericObject;
  }

  return await new Promise<GenericObject>((resolve, reject) => {
    api.storage.sync.get(key, (value: GenericObject) => {
      const err = toError();
      if (err) {
        reject(err);
        return;
      }
      resolve(value);
    });
  });
}

export async function storageSyncSet(values: GenericObject): Promise<void> {
  if (isFirefoxStyleApi) {
    await api.storage.sync.set(values);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    api.storage.sync.set(values, () => {
      const err = toError();
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function storageLocalGet(key: string): Promise<GenericObject> {
  if (isFirefoxStyleApi) {
    return (await api.storage.local.get(key)) as GenericObject;
  }

  return await new Promise<GenericObject>((resolve, reject) => {
    api.storage.local.get(key, (value: GenericObject) => {
      const err = toError();
      if (err) {
        reject(err);
        return;
      }
      resolve(value);
    });
  });
}

export async function storageLocalSet(values: GenericObject): Promise<void> {
  if (isFirefoxStyleApi) {
    await api.storage.local.set(values);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    api.storage.local.set(values, () => {
      const err = toError();
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export async function storageLocalRemove(key: string): Promise<void> {
  if (isFirefoxStyleApi) {
    await api.storage.local.remove(key);
    return;
  }

  await new Promise<void>((resolve, reject) => {
    api.storage.local.remove(key, () => {
      const err = toError();
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
    api.scripting.executeScript({
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
    api.scripting.executeScript({
      target: { tabId },
      func,
      args
    })
  );
}

export async function tabsSendMessage<TResponse>(
  tabId: number,
  payload: GenericObject
): Promise<TResponse> {
  if (isFirefoxStyleApi) {
    return (await api.tabs.sendMessage(tabId, payload)) as TResponse;
  }

  return await new Promise<TResponse>((resolve, reject) => {
    api.tabs.sendMessage(tabId, payload, (response: TResponse) => {
      const err = toError();
      if (err) {
        reject(err);
        return;
      }
      resolve(response);
    });
  });
}

export async function tabsCreate(url: string, active = false): Promise<void> {
  await Promise.resolve(api.tabs.create({ url, active }));
}

export async function actionSetBadgeBackgroundColor(color: string): Promise<void> {
  await Promise.resolve(api.action.setBadgeBackgroundColor({ color }));
}

export async function actionSetBadgeText(text: string): Promise<void> {
  await Promise.resolve(api.action.setBadgeText({ text }));
}

export async function actionSetTitle(title: string): Promise<void> {
  await Promise.resolve(api.action.setTitle({ title }));
}
