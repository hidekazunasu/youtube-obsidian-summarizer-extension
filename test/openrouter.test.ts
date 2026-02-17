import { describe, expect, it, vi } from 'vitest';
import { buildPrompt, parseSummaryJson, summarizeVideo } from '../src/lib/openrouter';
import { baseSettings, sampleVideo } from './fixtures';

describe('parseSummaryJson', () => {
  it('extracts first JSON object from wrapped content', () => {
    const raw = [
      '```json',
      '{',
      '  "summary_lines": ["a", "b", "c"],',
      '  "key_points": ["1", "2", "3", "4", "5"],',
      '  "keywords": ["x", "y", "z"],',
      '  "broad_tags": ["llm", "openai"]',
      '}',
      '```'
    ].join('\n');

    const parsed = parseSummaryJson(raw);
    expect(parsed.summary_lines).toHaveLength(3);
    expect(parsed.key_points).toHaveLength(5);
    expect(parsed.keywords).toEqual(['x', 'y', 'z']);
    expect(parsed.broad_tags).toEqual(['llm', 'openai']);
  });
});

describe('buildPrompt', () => {
  it('truncates transcript over 30000 chars and adds notice', () => {
    const longVideo = {
      ...sampleVideo,
      transcriptText: 'x'.repeat(30050)
    };

    const prompt = buildPrompt(longVideo, 'ja');
    expect(prompt).toContain('Transcript note: input was truncated to first 30000 characters.');
    expect(prompt).toContain('...[TRUNCATED]');
  });

  it('adds strict output language instruction', () => {
    const prompt = buildPrompt(sampleVideo, 'ja');
    expect(prompt).toContain('All output text must be in Japanese.');
  });
});

describe('summarizeVideo', () => {
  it('retries on 429 and succeeds on later attempt', async () => {
    const okPayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary_lines: ['a', 'b', 'c'],
              key_points: ['1', '2', '3', '4', '5'],
              keywords: ['k1', 'k2', 'k3'],
              broad_tags: ['llm', 'openai']
            })
          }
        }
      ]
    };

    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: async () => 'rate limit'
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => okPayload,
        text: async () => JSON.stringify(okPayload)
      }) as unknown as typeof fetch;

    const sleepMs = vi.fn(async () => undefined);

    const result = await summarizeVideo(sampleVideo, baseSettings, {
      fetchImpl,
      sleepMs,
      random: () => 0
    });

    expect(result.summaryLines).toHaveLength(3);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleepMs).toHaveBeenCalledTimes(1);

    const firstCallBody = JSON.parse(
      (fetchImpl as unknown as { mock: { calls: Array<[string, { body: string }]> } }).mock
        .calls[0][1].body
    );
    expect(firstCallBody.response_format).toEqual({ type: 'json_object' });
  });

  it('adds language notice when ja is selected but output is mostly English', async () => {
    const englishPayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              summary_lines: [
                'This video compares hand grinder performance and tasting outcomes.',
                'Several burr types are compared for filter brewing.',
                'The blind test results vary by setup.'
              ],
              key_points: [
                'Hardware design affects extraction',
                'Particle spread is not everything',
                'Budget options can compete',
                'Premium options offer consistency',
                'Taste preference still dominates'
              ],
              keywords: ['coffee', 'grinder', 'burr'],
              broad_tags: ['coffee', 'gear']
            })
          }
        }
      ]
    };

    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => englishPayload,
      text: async () => JSON.stringify(englishPayload)
    }) as unknown as typeof fetch;

    const result = await summarizeVideo(sampleVideo, baseSettings, {
      fetchImpl
    });

    expect(result.languageNotice).toContain('選択言語（ja）以外');
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
