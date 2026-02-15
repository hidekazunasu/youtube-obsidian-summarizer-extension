import type {
  CollectVideoDataMessage,
  CollectVideoDataMessageResponse,
  VideoData
} from '../lib/types';
import { decodeHtmlEntities } from '../lib/utils';

chrome.runtime.onMessage.addListener((message: CollectVideoDataMessage, _sender, sendResponse) => {
  if (message.type !== 'COLLECT_VIDEO_DATA') {
    return;
  }

  void handleCollect()
    .then((data): CollectVideoDataMessageResponse => ({ ok: true, data }))
    .catch((err): CollectVideoDataMessageResponse => ({
      ok: false,
      code: err?.code ?? 'COLLECTION_ERROR',
      message: err instanceof Error ? err.message : String(err)
    }))
    .then((payload) => {
      sendResponse(payload);
    });

  return true;
});

async function handleCollect(): Promise<VideoData> {
  const url = new URL(location.href);
  if (!url.pathname.startsWith('/watch')) {
    throw {
      code: 'NOT_WATCH_PAGE',
      message: 'This page is not a YouTube watch page.'
    };
  }

  const playerResponse = await loadPlayerResponse();
  const captionTracks =
    playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];

  if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
    throw {
      code: 'NO_TRANSCRIPT',
      message: 'No caption track is available for this video.'
    };
  }

  const preferred =
    captionTracks.find((track: any) => track.kind !== 'asr') ?? captionTracks[0];

  const transcriptText = await fetchTranscript(preferred.baseUrl as string);
  if (!transcriptText.trim()) {
    throw {
      code: 'NO_TRANSCRIPT',
      message: 'Transcript was empty.'
    };
  }

  const title =
    document.querySelector('meta[name="title"]')?.getAttribute('content') ??
    document.title.replace(/ - YouTube$/, '');

  const channel =
    document.querySelector('ytd-watch-metadata #channel-name a')?.textContent?.trim() ??
    playerResponse?.videoDetails?.author ??
    'unknown-channel';

  return {
    videoId:
      url.searchParams.get('v') ?? playerResponse?.videoDetails?.videoId ?? 'unknown-video',
    title,
    channel,
    url: location.href,
    publishedAt: playerResponse?.microformat?.playerMicroformatRenderer?.publishDate,
    transcriptText
  };
}

async function loadPlayerResponse(): Promise<any> {
  const html = await fetch(location.href, { credentials: 'include' }).then((r) => r.text());

  const marker = 'ytInitialPlayerResponse = ';
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) {
    throw new Error('Could not locate ytInitialPlayerResponse in page HTML.');
  }

  const start = markerIndex + marker.length;
  const jsonText = extractJsonObjectFrom(html, start);
  return JSON.parse(jsonText);
}

function extractJsonObjectFrom(input: string, start: number): string {
  let depth = 0;
  let inString = false;
  let escaped = false;
  let begun = false;

  for (let i = start; i < input.length; i += 1) {
    const char = input[i];

    if (!begun) {
      if (char === '{') {
        begun = true;
        depth = 1;
      }
      continue;
    }

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
        return input.slice(start, i + 1).trim();
      }
    }
  }

  throw new Error('Could not parse player response JSON object.');
}

async function fetchTranscript(baseUrl: string): Promise<string> {
  const separator = baseUrl.includes('?') ? '&' : '?';
  const url = `${baseUrl}${separator}fmt=json3`;

  const payload = await fetch(url, { credentials: 'include' }).then((r) => r.json());
  const events = payload?.events;
  if (!Array.isArray(events)) {
    return '';
  }

  const lines: string[] = [];
  for (const event of events) {
    if (!Array.isArray(event?.segs)) {
      continue;
    }
    const text = event.segs
      .map((seg: any) => decodeHtmlEntities(String(seg?.utf8 ?? '')))
      .join('')
      .trim();

    if (text) {
      lines.push(text);
    }
  }

  return lines.join('\n');
}
