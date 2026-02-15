export interface ExtensionSettings {
  openrouterApiKey: string;
  openrouterModel: string;
  obsidianVaultName: string;
  obsidianFolderPattern: string;
  obsidianFilenamePattern: string;
  obsidianRestEnabled: boolean;
  obsidianRestBaseUrl: string;
  obsidianRestApiKey: string;
  summaryLanguage: string;
}

export interface VideoData {
  videoId: string;
  title: string;
  channel: string;
  url: string;
  publishedAt?: string;
  transcriptText: string;
}

export interface SummaryResult {
  summaryLines: string[];
  keyPoints: string[];
  keywords: string[];
  broadTags: string[];
  model: string;
}

export interface NotePayload {
  path: string;
  content: string;
}

export type SaveStatus = 'rest_saved' | 'uri_fallback_saved' | 'failed';

export interface SaveResult {
  status: SaveStatus;
  message?: string;
}

export interface CollectVideoDataRequest {
  type: 'COLLECT_VIDEO_DATA';
}

export interface CollectVideoDataResponse {
  ok: true;
  data: VideoData;
}

export interface CollectVideoDataErrorResponse {
  ok: false;
  code: 'NO_TRANSCRIPT' | 'NOT_WATCH_PAGE' | 'COLLECTION_ERROR';
  message: string;
}

export type CollectVideoDataMessage = CollectVideoDataRequest;
export type CollectVideoDataMessageResponse =
  | CollectVideoDataResponse
  | CollectVideoDataErrorResponse;
