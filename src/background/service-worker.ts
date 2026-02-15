import { buildNotePayload } from '../lib/note';
import { summarizeVideo } from '../lib/openrouter';
import { saveToObsidian } from '../lib/obsidian';
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
  VideoData
} from '../lib/types';

chrome.runtime.onInstalled.addListener(async () => {
  const current = await chrome.storage.sync.get('settings');
  if (!current.settings) {
    await saveSettings(DEFAULT_SETTINGS);
  }
});

chrome.action.onClicked.addListener(async (tab) => {
  try {
    if (!tab.id) {
      return;
    }

    if (!tab.url?.includes('youtube.com/watch')) {
      await showAlert(tab.id, 'YouTube watchページで実行してください。');
      return;
    }

    const settings = await getSettings();
    const validationError = validateSettings(settings);
    if (validationError) {
      await showAlert(tab.id, validationError);
      await chrome.runtime.openOptionsPage();
      return;
    }

    const videoData = await collectVideoData(tab.id);
    const summary = await summarizeVideo(videoData, settings);
    const note = buildNotePayload(videoData, summary, settings);

    const saveResult = await saveToObsidian(note, settings);
    if (saveResult.status === 'failed') {
      throw new Error(saveResult.message ?? 'Obsidian保存に失敗しました。');
    }

    const suffix =
      saveResult.status === 'uri_fallback_saved'
        ? '（URIフォールバック）'
        : '（REST API）';

    await clearLastErrorRecord();
    await showAlert(tab.id, `保存完了 ${suffix}\n${note.path}`);
  } catch (err) {
    const message = userSafeError(err);
    await saveLastErrorRecord(formatErrorForClipboard(err));
    await showAlert(tab.id, `失敗: ${message}`);
  }
});

async function collectVideoData(tabId: number): Promise<VideoData> {
  // Ensure content script is present even on already-open tabs after install/update.
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content.js']
  });

  const response = (await chrome.tabs.sendMessage(tabId, {
    type: 'COLLECT_VIDEO_DATA'
  })) as CollectVideoDataMessageResponse;

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
  if (!settings.obsidianVaultName.trim()) {
    return 'Obsidian vault名が未設定です。オプション画面で設定してください。';
  }
  if (settings.obsidianRestEnabled && !settings.obsidianRestApiKey.trim()) {
    return 'Obsidian REST APIキーが未設定です。オプション画面で設定してください。';
  }
  return null;
}

async function showAlert(tabId: number, message: string): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (msg: string) => {
        window.alert(msg);
      },
      args: [message]
    });
    return;
  } catch (error) {
    console.warn('Alert injection failed. Falling back to badge.', error);
  }

  await chrome.action.setBadgeBackgroundColor({ color: '#9b3d00' });
  await chrome.action.setBadgeText({ text: '!' });
  await chrome.action.setTitle({ title: `YouTube to Obsidian: ${message}` });
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
