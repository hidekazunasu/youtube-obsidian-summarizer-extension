import type { ExtensionSettings, SummaryResult, VideoData } from './types';

interface OpenRouterChatResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
}

interface ParsedSummary {
  summary_lines: string[];
  key_points: string[];
  keywords: string[];
  broad_tags: string[];
}

export interface SummarizeVideoDeps {
  fetchImpl?: typeof fetch;
  sleepMs?: (ms: number) => Promise<void>;
  random?: () => number;
}

const MAX_TRANSCRIPT_CHARS = 30_000;
const MAX_RETRIES = 3;
const BASE_RETRY_MS = 500;

export async function summarizeVideo(
  video: VideoData,
  settings: ExtensionSettings,
  deps: SummarizeVideoDeps = {}
): Promise<SummaryResult> {
  const fetchImpl = deps.fetchImpl ?? fetch;
  const sleepMs = deps.sleepMs ?? defaultSleep;
  const random = deps.random ?? Math.random;

  const prompt = buildPrompt(video, settings.summaryLanguage);
  let attempt = 0;

  while (true) {
    try {
      const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.openrouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://youtube.com',
          'X-Title': 'youtube-obsidian-extension'
        },
        body: JSON.stringify({
          model: settings.openrouterModel,
          response_format: { type: 'json_object' },
          messages: [
            {
              role: 'system',
              content:
                'You summarize YouTube transcripts. Return strict JSON with summary_lines, key_points, keywords, broad_tags.'
            },
            {
              role: 'user',
              content: prompt
            }
          ]
        })
      });

      if (!response.ok) {
        const body = await response.text();
        if (shouldRetryStatus(response.status) && attempt < MAX_RETRIES) {
          await sleepMs(nextBackoffMs(attempt, random));
          attempt += 1;
          continue;
        }
        throw new Error(`OpenRouter API failed (${response.status}): ${body.slice(0, 200)}`);
      }

      const payload = (await response.json()) as OpenRouterChatResponse;
      const content = payload.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('OpenRouter returned an empty response.');
      }

      const parsed = parseSummaryJson(content);
      return {
        summaryLines: parsed.summary_lines,
        keyPoints: parsed.key_points,
        keywords: parsed.keywords,
        broadTags: parsed.broad_tags,
        model: settings.openrouterModel
      };
    } catch (error) {
      if (attempt >= MAX_RETRIES) {
        throw error;
      }

      const message = error instanceof Error ? error.message : String(error);
      const networkLikeFailure =
        message.includes('fetch') ||
        message.includes('network') ||
        message.includes('Failed to fetch');

      if (!networkLikeFailure) {
        throw error;
      }

      await sleepMs(nextBackoffMs(attempt, random));
      attempt += 1;
    }
  }
}

export function buildPrompt(video: VideoData, language: string): string {
  const { text: transcript, truncated } = truncateTranscript(video.transcriptText);

  return [
    `Language: ${language}`,
    'Output rules:',
    '- summary_lines: 3-5 lines',
    '- key_points: 5-10 bullet points (as array items)',
    '- keywords: 3-8 short terms',
    '- broad_tags: 2-6 broad topic tags in lowercase (e.g. llm, chatgpt, openai, ai, programming, finance, health, startup, marketing, design)',
    '',
    `Title: ${video.title}`,
    `Channel: ${video.channel}`,
    `URL: ${video.url}`,
    truncated
      ? `Transcript note: input was truncated to first ${MAX_TRANSCRIPT_CHARS} characters.`
      : 'Transcript note: full transcript included.',
    'Transcript:',
    transcript
  ].join('\n');
}

export function parseSummaryJson(raw: string): ParsedSummary {
  const jsonText = extractFirstJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<ParsedSummary>;

  const summaryLines = ensureStringArray(parsed.summary_lines, 3, 5);
  const keyPoints = ensureStringArray(parsed.key_points, 5, 10);
  const keywords = ensureStringArray(parsed.keywords, 3, 8);
  const broadTags = ensureStringArray(parsed.broad_tags, 2, 6);

  return {
    summary_lines: summaryLines,
    key_points: keyPoints,
    keywords,
    broad_tags: broadTags
  };
}

function ensureStringArray(value: unknown, min: number, max: number): string[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected array in model output.');
  }
  const items = value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
    .slice(0, max);

  if (items.length < min) {
    throw new Error(`Expected at least ${min} items in model output.`);
  }

  return items;
}

function extractFirstJsonObject(input: string): string {
  const start = input.indexOf('{');
  if (start === -1) {
    throw new Error('No JSON object found in model output.');
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < input.length; i += 1) {
    const char = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === '{') {
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        return input.slice(start, i + 1);
      }
    }
  }

  throw new Error('Unterminated JSON object in model output.');
}

function truncateTranscript(text: string): { text: string; truncated: boolean } {
  if (text.length <= MAX_TRANSCRIPT_CHARS) {
    return { text, truncated: false };
  }

  return {
    text: `${text.slice(0, MAX_TRANSCRIPT_CHARS)}\n...[TRUNCATED]`,
    truncated: true
  };
}

function shouldRetryStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

function nextBackoffMs(attempt: number, random: () => number): number {
  const base = BASE_RETRY_MS * 2 ** attempt;
  const jitter = Math.floor(random() * 200);
  return base + jitter;
}

async function defaultSleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
