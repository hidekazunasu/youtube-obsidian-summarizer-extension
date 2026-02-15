import type { ExtensionSettings, NotePayload, SummaryResult, VideoData } from './types';
import { applyPattern, formatDate, sanitizePathSegment } from './utils';

export function buildNote(video: VideoData, summary: SummaryResult): string {
  const yaml = [
    '---',
    'source: youtube',
    `video_id: "${escapeYaml(video.videoId)}"`,
    `title: "${escapeYaml(video.title)}"`,
    `channel: "${escapeYaml(video.channel)}"`,
    `url: "${escapeYaml(video.url)}"`,
    `saved_at: "${new Date().toISOString()}"`,
    `model: "${escapeYaml(summary.model)}"`,
    '---'
  ].join('\n');

  const body = [
    '## Summary',
    ...summary.summaryLines.map((line) => `- ${line}`),
    '',
    '## Key Points',
    ...summary.keyPoints.map((point) => `- ${point}`),
    '',
    '## Keywords',
    summary.keywords.join(', '),
    '',
    '## Source',
    video.url
  ].join('\n');

  return `${yaml}\n\n${body}\n`;
}

export function buildNotePayload(
  video: VideoData,
  summary: SummaryResult,
  settings: ExtensionSettings
): NotePayload {
  const safeChannel = sanitizePathSegment(video.channel);
  const safeTitle = sanitizePathSegment(video.title);
  const today = formatDate();

  const folder = applyPattern(settings.obsidianFolderPattern, {
    channel: safeChannel
  }).replace(/\\+/g, '/');

  const filename = applyPattern(settings.obsidianFilenamePattern, {
    'yyyy-mm-dd': today,
    title: safeTitle,
    videoId: video.videoId,
    channel: safeChannel
  });

  const path = `${folder}/${filename}`.replace(/\/+/g, '/');
  return {
    path,
    content: buildNote(video, summary)
  };
}

function escapeYaml(value: string): string {
  return value.replace(/"/g, '\\"');
}
