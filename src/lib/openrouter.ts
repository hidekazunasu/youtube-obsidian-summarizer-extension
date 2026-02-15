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
}

export async function summarizeVideo(
  video: VideoData,
  settings: ExtensionSettings,
  fetchImpl: typeof fetch = fetch
): Promise<SummaryResult> {
  const prompt = buildPrompt(video, settings.summaryLanguage);
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
      messages: [
        {
          role: 'system',
          content:
            'You summarize YouTube transcripts. Return strict JSON with summary_lines, key_points, keywords.'
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
    model: settings.openrouterModel
  };
}

export function buildPrompt(video: VideoData, language: string): string {
  return [
    `Language: ${language}`,
    'Output rules:',
    '- summary_lines: 3-5 lines',
    '- key_points: 5-10 bullet points (as array items)',
    '- keywords: 3-8 short terms',
    '',
    `Title: ${video.title}`,
    `Channel: ${video.channel}`,
    `URL: ${video.url}`,
    'Transcript:',
    video.transcriptText
  ].join('\n');
}

export function parseSummaryJson(raw: string): ParsedSummary {
  const jsonText = extractFirstJsonObject(raw);
  const parsed = JSON.parse(jsonText) as Partial<ParsedSummary>;

  const summaryLines = ensureStringArray(parsed.summary_lines, 3, 5);
  const keyPoints = ensureStringArray(parsed.key_points, 5, 10);
  const keywords = ensureStringArray(parsed.keywords, 3, 8);

  return {
    summary_lines: summaryLines,
    key_points: keyPoints,
    keywords
  };
}

function ensureStringArray(
  value: unknown,
  min: number,
  max: number
): string[] {
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
