import type {
  CollectVideoDataMessage,
  CollectVideoDataMessageResponse,
  VideoData
} from '../lib/types';

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

  const videoId =
    url.searchParams.get('v') ?? playerResponse?.videoDetails?.videoId ?? 'unknown-video';
  const transcriptText = await resolveTranscript(captionTracks, videoId);
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
    videoId,
    title,
    channel,
    url: location.href,
    publishedAt: playerResponse?.microformat?.playerMicroformatRenderer?.publishDate,
    transcriptText
  };
}

async function resolveTranscript(captionTracks: any[], videoId: string): Promise<string> {
  if (Array.isArray(captionTracks) && captionTracks.length > 0) {
    const preferred =
      captionTracks.find((track: any) => track.kind !== 'asr') ?? captionTracks[0];
    const fromTrack = await fetchTranscript(preferred.baseUrl as string);
    if (fromTrack.trim()) {
      return fromTrack;
    }
  }

  const fromTimedText = await fetchTranscriptFromTimedText(videoId);
  if (fromTimedText.trim()) {
    return fromTimedText;
  }

  const fromDomPanel = await fetchTranscriptFromDomPanel();
  return fromDomPanel;
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
  try {
    return JSON.parse(jsonText);
  } catch (error) {
    throw new Error(
      `Could not parse ytInitialPlayerResponse JSON: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
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
  const raw = await fetch(url, { credentials: 'include' }).then((r) => r.text());
  if (!raw.trim()) {
    return '';
  }

  // YouTube may return JSON3, XML captions, or an error page.
  const asJson = tryParseJson(raw);
  if (asJson) {
    const events = asJson?.events;
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

  return extractTranscriptFromXml(raw);
}

function decodeHtmlEntities(text: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(text, 'text/html');
  return doc.documentElement.textContent ?? text;
}

function tryParseJson(text: string): any | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function extractTranscriptFromXml(xmlText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    return '';
  }

  const nodes = Array.from(doc.querySelectorAll('text'));
  const lines = nodes
    .map((node) => decodeHtmlEntities(node.textContent ?? '').trim())
    .filter((line) => line.length > 0);

  return lines.join('\n');
}

async function fetchTranscriptFromTimedText(videoId: string): Promise<string> {
  const pageLang = (document.documentElement.lang || 'ja').toLowerCase();
  const langCandidates = Array.from(new Set([pageLang, 'ja', 'en']));
  const kindCandidates = ['asr', ''];

  for (const lang of langCandidates) {
    for (const kind of kindCandidates) {
      const params = new URLSearchParams({
        v: videoId,
        lang,
        fmt: 'json3'
      });
      if (kind) {
        params.set('kind', kind);
      }

      const url = `https://www.youtube.com/api/timedtext?${params.toString()}`;
      const text = await fetchTranscript(url);
      if (text.trim()) {
        return text;
      }
    }
  }

  return '';
}

async function fetchTranscriptFromDomPanel(): Promise<string> {
  const existing = collectTranscriptSegmentsFromDom();
  if (existing.trim()) {
    return existing;
  }

  await tryOpenTranscriptPanel();
  const appeared = await waitFor(() => collectTranscriptSegmentsFromDom(), 3000, 120);
  return appeared.trim();
}

function collectTranscriptSegmentsFromDom(): string {
  const segmentSelectors = [
    'ytd-transcript-segment-renderer .segment-text',
    'ytd-transcript-segment-renderer yt-formatted-string',
    'ytd-engagement-panel-section-list-renderer[visibility="ENGAGEMENT_PANEL_VISIBILITY_EXPANDED"] ytd-transcript-segment-renderer'
  ];

  for (const selector of segmentSelectors) {
    const nodes = Array.from(document.querySelectorAll(selector));
    const lines = nodes
      .map((node) => (node.textContent ?? '').trim())
      .filter((line) => line.length > 0);

    if (lines.length > 0) {
      return lines.join('\n');
    }
  }

  return '';
}

async function tryOpenTranscriptPanel(): Promise<void> {
  const directTriggerSelectors = [
    'button[aria-label*="transcript" i]',
    'button[aria-label*="文字起こし"]',
    'ytd-video-description-transcript-section-renderer button',
    'tp-yt-paper-button[aria-label*="transcript" i]',
    'tp-yt-paper-button[aria-label*="文字起こし"]'
  ];

  if (clickFirstMatching(directTriggerSelectors)) {
    await sleep(300);
    return;
  }

  const menuButtons = [
    'ytd-menu-renderer yt-icon-button button',
    'button[aria-label*="More actions" i]',
    'button[aria-label*="その他の操作"]'
  ];
  if (clickFirstMatching(menuButtons)) {
    await sleep(300);
  }

  const menuItems = Array.from(
    document.querySelectorAll(
      'ytd-menu-service-item-renderer,tp-yt-paper-item,ytd-menu-navigation-item-renderer'
    )
  ) as HTMLElement[];

  for (const item of menuItems) {
    const label = (item.textContent ?? '').toLowerCase();
    if (label.includes('transcript') || label.includes('文字起こし')) {
      item.click();
      await sleep(300);
      return;
    }
  }
}

function clickFirstMatching(selectors: string[]): boolean {
  for (const selector of selectors) {
    const node = document.querySelector(selector);
    if (!(node instanceof HTMLElement)) {
      continue;
    }
    node.click();
    return true;
  }
  return false;
}

async function waitFor(
  producer: () => string,
  timeoutMs: number,
  intervalMs: number
): Promise<string> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = producer();
    if (value.trim()) {
      return value;
    }
    await sleep(intervalMs);
  }
  return '';
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
