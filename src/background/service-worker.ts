import { buildNotePayload } from '../lib/note';
import { saveToNotion } from '../lib/notion';
import { saveToObsidian } from '../lib/obsidian';
import { summarizeVideo } from '../lib/openrouter';
import {
  clearLastErrorRecord,
  DEFAULT_SETTINGS,
  getSettings,
  saveLastErrorRecord,
  saveSettings
} from '../lib/settings';
import type {
  CollectVideoDataMessageResponse,
  ExtensionSettings,
  SaveResult,
  SummaryResult,
  VideoData
} from '../lib/types';
import {
  actionSetBadgeBackgroundColor,
  actionSetBadgeText,
  actionSetTitle,
  executeScriptFile,
  executeScriptFunction,
  isWebExtAvailable,
  onActionClicked,
  onInstalled,
  openOptionsPage,
  storageSyncGet,
  tabsSendMessage
} from '../lib/webext-api';

export interface BrowserTab {
  id?: number;
  url?: string;
}

export interface BackgroundDeps {
  storageSyncGet: (key: string) => Promise<Record<string, unknown>>;
  saveSettings: (settings: ExtensionSettings) => Promise<void>;
  getSettings: () => Promise<ExtensionSettings>;
  openOptionsPage: () => Promise<void>;
  collectVideoData: (tabId: number) => Promise<VideoData>;
  summarizeVideo: typeof summarizeVideo;
  buildNotePayload: typeof buildNotePayload;
  saveToObsidian: typeof saveToObsidian;
  saveToNotion: typeof saveToNotion;
  clearLastErrorRecord: () => Promise<void>;
  saveLastErrorRecord: (text: string) => Promise<void>;
  showAlert: (tabId: number, message: string) => Promise<void>;
}

const defaultDeps: BackgroundDeps = {
  storageSyncGet,
  saveSettings,
  getSettings,
  openOptionsPage,
  collectVideoData,
  summarizeVideo,
  buildNotePayload,
  saveToObsidian,
  saveToNotion,
  clearLastErrorRecord,
  saveLastErrorRecord,
  showAlert
};

export function createOnInstalledHandler(
  deps: Pick<BackgroundDeps, 'storageSyncGet' | 'saveSettings'> = defaultDeps
): () => Promise<void> {
  return async () => {
    const current = await deps.storageSyncGet('settings_public');
    if (!current.settings_public) {
      await deps.saveSettings(DEFAULT_SETTINGS);
    }
  };
}

export function createActionClickHandler(
  overrides: Partial<BackgroundDeps> = {}
): (tab: BrowserTab) => Promise<void> {
  const deps: BackgroundDeps = {
    ...defaultDeps,
    ...overrides
  };

  return async (tab: BrowserTab): Promise<void> => {
    try {
      if (!tab.id) {
        return;
      }

      if (!tab.url?.includes('youtube.com/watch')) {
        await deps.showAlert(tab.id, 'YouTube watchページで実行してください。');
        return;
      }

      const settings = await deps.getSettings();
      const validationError = validateSettings(settings);
      if (validationError) {
        await deps.showAlert(tab.id, validationError);
        await deps.openOptionsPage();
        return;
      }

      const videoData = await deps.collectVideoData(tab.id);
      const summary = await deps.summarizeVideo(videoData, settings);
      const note = deps.buildNotePayload(videoData, summary, settings);

      const saveResult = await saveByDestination(
        settings,
        deps.saveToObsidian,
        deps.saveToNotion,
        note,
        videoData,
        summary
      );
      if (saveResult.status === 'failed') {
        throw new Error(saveResult.message ?? '保存に失敗しました。');
      }

      const languageNotice = summary.languageNotice ? `\n${summary.languageNotice}` : '';
      const successSuffix = buildSuccessSuffix(settings, saveResult);
      const successDetail =
        settings.outputDestination === 'notion' ? saveResult.message ?? note.path : note.path;

      await deps.clearLastErrorRecord();
      await deps.showAlert(tab.id, `保存完了 ${successSuffix}\n${successDetail}${languageNotice}`);
    } catch (err) {
      const message = userSafeError(err);
      await deps.saveLastErrorRecord(formatErrorForClipboard(err));
      if (tab.id) {
        await deps.showAlert(tab.id, `失敗: ${message}`);
      }
    }
  };
}

export function registerBackgroundListeners(): void {
  onInstalled(createOnInstalledHandler());
  onActionClicked(createActionClickHandler());
}

export async function collectVideoData(tabId: number): Promise<VideoData> {
  // Ensure content script is present even on already-open tabs after install/update.
  await executeScriptFile(tabId, 'content.js');

  const response = await tabsSendMessage<CollectVideoDataMessageResponse>(tabId, {
    type: 'COLLECT_VIDEO_DATA'
  });

  if (!response) {
    throw new Error('content scriptから応答がありません。ページを再読み込みしてください。');
  }

  if (!response.ok) {
    if (response.code === 'NO_TRANSCRIPT') {
      throw new Error('字幕が取得できないため保存を中止しました。');
    }
    throw new Error(response.message);
  }

  return response.data;
}

function validateSettings(settings: ExtensionSettings): string | null {
  if (!settings.openrouterApiKey.trim()) {
    return 'OpenRouter APIキーが未設定です。オプション画面で設定してください。';
  }

  if (settings.outputDestination === 'notion') {
    if (!settings.notionParentPageId.trim()) {
      return 'Notion Parent Page IDが未設定です。オプション画面で設定してください。';
    }
    if (!settings.notionApiToken.trim()) {
      return 'Notion API Tokenが未設定です。オプション画面で設定してください。';
    }
    return null;
  }

  if (!settings.obsidianVaultName.trim()) {
    return 'Obsidian vault名が未設定です。オプション画面で設定してください。';
  }
  if (settings.obsidianRestEnabled && !settings.obsidianRestApiKey.trim()) {
    return 'Obsidian REST APIキーが未設定です。オプション画面で設定してください。';
  }
  return null;
}

async function saveByDestination(
  settings: ExtensionSettings,
  saveObsidian: typeof saveToObsidian,
  saveNotion: typeof saveToNotion,
  note: ReturnType<typeof buildNotePayload>,
  video: VideoData,
  summary: SummaryResult
): Promise<SaveResult> {
  if (settings.outputDestination === 'notion') {
    return await saveNotion(note, video, summary, settings);
  }
  return await saveObsidian(note, settings);
}

function buildSuccessSuffix(settings: ExtensionSettings, saveResult: SaveResult): string {
  if (settings.outputDestination === 'notion') {
    return '（Notion）';
  }
  if (saveResult.status === 'uri_fallback_saved') {
    return '（Obsidian: URIフォールバック）';
  }
  return '（Obsidian: REST API）';
}

export async function showAlert(tabId: number, message: string): Promise<void> {
  try {
    await executeScriptFunction(
      tabId,
      (msg: string) => {
        window.alert(msg);
      },
      [message]
    );
    return;
  } catch (error) {
    console.warn('Alert injection failed. Falling back to badge.', error);
  }

  await actionSetBadgeBackgroundColor('#9b3d00');
  await actionSetBadgeText('!');
  await actionSetTitle(`YouTube Summarizer: ${message}`);
}

function userSafeError(err: unknown): string {
  if (err instanceof Error) {
    return err.message.slice(0, 300);
  }
  return String(err).slice(0, 300);
}

function formatErrorForClipboard(err: unknown): string {
  if (err instanceof Error) {
    const stack = err.stack ? `\nStack:\n${err.stack}` : '';
    return `${err.name}: ${err.message}${stack}`;
  }
  return String(err);
}

if (isWebExtAvailable()) {
  registerBackgroundListeners();
}
