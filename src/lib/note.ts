import type { ExtensionSettings, NotePayload, SummaryResult, VideoData } from './types';
import { applyPattern, formatDate, sanitizePathSegment } from './utils';

export function buildNote(
  video: VideoData,
  summary: SummaryResult,
  now: Date = new Date()
): string {
  const tags = buildAutoTags(video.channel, summary.keywords, summary.broadTags);
  const yaml = [
    '---',
    'source: youtube',
    `video_id: "${escapeYaml(video.videoId)}"`,
    `title: "${escapeYaml(video.title)}"`,
    `channel: "${escapeYaml(video.channel)}"`,
    `url: "${escapeYaml(video.url)}"`,
    `saved_at: "${escapeYaml(now.toISOString())}"`,
    `model: "${escapeYaml(summary.model)}"`,
    'tags:',
    ...tags.map((tag) => `  - ${tag}`),
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
  settings: ExtensionSettings,
  now: Date = new Date()
): NotePayload {
  const safeChannel = sanitizePathSegment(video.channel);
  const safeTitle = sanitizePathSegment(video.title);
  const today = formatDate(now);

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
    content: buildNote(video, summary, now)
  };
}

function escapeYaml(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/"/g, '\\"')
    .replace(/:/g, '\\:')
    .replace(/#/g, '\\#')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}');
}

function buildAutoTags(channel: string, keywords: string[], broadTags: string[]): string[] {
  const baseTags = ['youtube'];
  const channelTag = toTagSegment(channel);
  if (channelTag) {
    baseTags.push(`youtube/${channelTag}`);
  }

  const keywordTags = keywords
    .map((keyword) => toTagSegment(keyword))
    .filter((tag): tag is string => tag.length > 0);

  const broadTopicTags = broadTags
    .map((tag) => toTagSegment(tag))
    .filter((tag): tag is string => tag.length > 0)
    .map((tag) => `topic/${tag}`);

  return dedupeCaseInsensitive([...baseTags, ...broadTopicTags, ...keywordTags]).slice(0, 20);
}

function toTagSegment(input: string): string {
  const normalized = input
    .trim()
    .replace(/^#+/, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_/-]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^[-/]+|[-/]+$/g, '');

  return normalized;
}

function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const value of values) {
    const key = value.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(value);
  }
  return output;
}
