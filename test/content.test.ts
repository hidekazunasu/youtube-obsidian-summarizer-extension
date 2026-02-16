import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  extractTranscriptFromXml,
  resolveTranscript,
  tryParseJson
} from '../src/content/youtube';

class FakeDOMParser {
  parseFromString(input: string, type: string) {
    if (type === 'application/xml') {
      if (input.includes('<parsererror>')) {
        return {
          querySelector: (selector: string) => (selector === 'parsererror' ? {} : null),
          querySelectorAll: () => []
        };
      }

      const matches = [...input.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)];
      return {
        querySelector: () => null,
        querySelectorAll: (selector: string) => {
          if (selector !== 'text') {
            return [];
          }
          return matches.map((match) => ({ textContent: match[1] }));
        }
      };
    }

    const stripped = input
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/<[^>]+>/g, '');

    return {
      documentElement: {
        textContent: stripped
      }
    };
  }
}

describe('content transcript resolution', () => {
  const originalDomParser = globalThis.DOMParser;

  beforeEach(() => {
    (globalThis as any).DOMParser = FakeDOMParser;
  });

  afterEach(() => {
    (globalThis as any).DOMParser = originalDomParser;
  });

  it('prefers caption track text first', async () => {
    const text = await resolveTranscript(
      [{ kind: '', baseUrl: 'track-url' }],
      'vid123',
      {
        fetchFromTrackBaseUrl: async () => 'track transcript',
        fetchFromTimedText: async () => 'timed transcript',
        fetchFromDomPanel: async () => 'dom transcript'
      }
    );

    expect(text).toBe('track transcript');
  });

  it('falls back to timedtext then dom transcript', async () => {
    const fromTimed = await resolveTranscript(
      [{ kind: '', baseUrl: 'track-url' }],
      'vid123',
      {
        fetchFromTrackBaseUrl: async () => '',
        fetchFromTimedText: async () => 'timed transcript',
        fetchFromDomPanel: async () => 'dom transcript'
      }
    );

    expect(fromTimed).toBe('timed transcript');

    const fromDom = await resolveTranscript(
      [{ kind: '', baseUrl: 'track-url' }],
      'vid123',
      {
        fetchFromTrackBaseUrl: async () => '',
        fetchFromTimedText: async () => '',
        fetchFromDomPanel: async () => 'dom transcript'
      }
    );

    expect(fromDom).toBe('dom transcript');
  });

  it('parses JSON/XML and handles empty values', () => {
    expect(tryParseJson('{"a":1}')).toEqual({ a: 1 });
    expect(tryParseJson('not-json')).toBeNull();

    const xml = '<transcript><text>one</text><text>two &amp; three</text></transcript>';
    expect(extractTranscriptFromXml(xml)).toBe('one\ntwo & three');
    expect(extractTranscriptFromXml('<parsererror>bad</parsererror>')).toBe('');
  });
});
