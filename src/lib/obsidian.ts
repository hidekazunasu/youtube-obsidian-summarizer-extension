import type { ExtensionSettings, NotePayload, SaveResult } from './types';

interface SaveDeps {
  fetchImpl?: typeof fetch;
  openUri?: (uri: string) => Promise<void>;
}

export async function saveToObsidian(
  note: NotePayload,
  settings: ExtensionSettings,
  deps: SaveDeps = {}
): Promise<SaveResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const openUri = deps.openUri ?? defaultOpenUri;

  if (settings.obsidianRestEnabled) {
    try {
      await saveViaRestApi(note, settings, fetchImpl);
      return {
        status: 'rest_saved'
      };
    } catch (err) {
      try {
        await saveViaUri(note, settings, openUri);
        return {
          status: 'uri_fallback_saved',
          message: `REST failed, fallback used: ${toMessage(err)}`
        };
      } catch (uriErr) {
        return {
          status: 'failed',
          message: `REST and URI failed: ${toMessage(err)} | ${toMessage(uriErr)}`
        };
      }
    }
  }

  try {
    await saveViaUri(note, settings, openUri);
    return {
      status: 'uri_fallback_saved'
    };
  } catch (err) {
    return {
      status: 'failed',
      message: `URI save failed: ${toMessage(err)}`
    };
  }
}

export async function saveViaRestApi(
  note: NotePayload,
  settings: ExtensionSettings,
  fetchImpl: typeof fetch = fetch
): Promise<void> {
  const base = settings.obsidianRestBaseUrl.replace(/\/$/, '');
  const endpoint = `${base}/vault/${encodePathSegments(note.path)}`;

  const response = await fetchImpl(endpoint, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${settings.obsidianRestApiKey}`,
      'Content-Type': 'text/markdown'
    },
    body: note.content
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Obsidian REST failed (${response.status}): ${body.slice(0, 200)}`);
  }
}

export async function saveViaUri(
  note: NotePayload,
  settings: ExtensionSettings,
  openUri: (uri: string) => Promise<void> = defaultOpenUri
): Promise<void> {
  const uri = buildObsidianNewUri(note, settings.obsidianVaultName);
  await openUri(uri);
}

export function buildObsidianNewUri(note: NotePayload, vaultName: string): string {
  const filePath = note.path.replace(/\.md$/i, '');
  const lastSlashIndex = filePath.lastIndexOf('/');
  const folder =
    lastSlashIndex >= 0 ? filePath.slice(0, lastSlashIndex) : '';
  const file = lastSlashIndex >= 0 ? filePath.slice(lastSlashIndex + 1) : filePath;
  const content = encodeURIComponent(note.content);
  const vault = encodeURIComponent(vaultName);
  const encFolder = encodeURIComponent(folder);
  const encFile = encodeURIComponent(file);
  return `obsidian://new?vault=${vault}&folder=${encFolder}&file=${encFile}&content=${content}`;
}

function encodePathSegments(path: string): string {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

async function defaultOpenUri(uri: string): Promise<void> {
  await chrome.tabs.create({ url: uri, active: false });
}

function toMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }
  return String(value);
}
