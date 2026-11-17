import { NextRequest, NextResponse } from 'next/server';

export interface YouTubeSearchResultItem {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  embedSrc: string;
  embedVerified?: boolean;
}

const SEARCH_CACHE = new Map<
  string,
  { expiresAt: number; results: YouTubeSearchResultItem[] }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

const VIDEO_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

function buildEmbedSrc(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
    modestbranding: '1',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

function sanitizeThumbnail(url: string | undefined, videoId: string): string {
  const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (!url) return fallback;
  const normalized = url.startsWith('//') ? `https:${url}` : url;
  if (/^https:\/\/[a-z0-9-]+\.ytimg\.com\//i.test(normalized)) {
    return normalized;
  }
  return fallback;
}

function extractDirectVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (VIDEO_ID_REGEX.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match?.[1] && VIDEO_ID_REGEX.test(match[1])) return match[1];
  }
  return null;
}

interface RawVideoCandidate {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

function readTextField(field: unknown): string {
  if (!field || typeof field !== 'object') return '';
  const f = field as {
    simpleText?: string;
    content?: string;
    runs?: Array<{ text?: string }>;
  };
  if (typeof f.simpleText === 'string' && f.simpleText.trim()) {
    return f.simpleText.trim();
  }
  if (typeof f.content === 'string' && f.content.trim()) {
    return f.content.trim();
  }
  if (Array.isArray(f.runs)) {
    return f.runs
      .map((r) => (typeof r?.text === 'string' ? r.text : ''))
      .join('')
      .trim();
  }
  return '';
}

function extractCandidatesFromData(root: unknown): RawVideoCandidate[] {
  const seen = new Set<string>();
  const candidates: RawVideoCandidate[] = [];
  const stack: unknown[] = [root];
  let visited = 0;

  const pushCandidate = (
    videoId: unknown,
    title: string,
    channel: string,
    duration: string,
    rawThumb?: string,
  ) => {
    if (typeof videoId !== 'string' || !VIDEO_ID_REGEX.test(videoId)) return;
    if (seen.has(videoId)) return;
    seen.add(videoId);
    candidates.push({
      videoId,
      title: title || 'YouTube Video',
      channel: channel || 'YouTube',
      duration: duration || 'VIDEO',
      thumbnail: sanitizeThumbnail(rawThumb, videoId),
    });
  };

  while (stack.length > 0 && candidates.length < 24 && visited < 12000) {
    const node = stack.pop();
    visited += 1;
    if (!node || typeof node !== 'object') continue;

    if (Array.isArray(node)) {
      for (let i = node.length - 1; i >= 0; i--) {
        stack.push(node[i]);
      }
      continue;
    }

    const obj = node as Record<string, unknown>;

    // Standard videoRenderer / gridVideoRenderer / compactVideoRenderer / playlistVideoRenderer
    const renderer = (obj.videoRenderer ||
      obj.gridVideoRenderer ||
      obj.compactVideoRenderer ||
      obj.playlistVideoRenderer) as Record<string, unknown> | undefined;

    if (renderer && typeof renderer === 'object') {
      const vid = renderer.videoId;
      const title = readTextField(renderer.title);
      const channel =
        readTextField(renderer.ownerText) ||
        readTextField(renderer.shortBylineText) ||
        readTextField(renderer.longBylineText);
      const badges = Array.isArray(renderer.badges)
        ? (renderer.badges as Array<{
            metadataBadgeRenderer?: { style?: string; label?: string };
          }>)
        : [];
      const isLive = badges.some(
        (b) =>
          b?.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_LIVE_NOW' ||
          b?.metadataBadgeRenderer?.label === 'LIVE',
      );
      const duration =
        readTextField(renderer.lengthText) || (isLive ? 'LIVE' : 'VIDEO');
      const thumbs = (
        renderer.thumbnail as { thumbnails?: Array<{ url?: string }> } | undefined
      )?.thumbnails;
      const rawThumb =
        Array.isArray(thumbs) && thumbs.length > 0
          ? thumbs[thumbs.length - 1]?.url
          : undefined;
      pushCandidate(vid, title, channel, duration, rawThumb);
    }

    // Newer YouTube lockupViewModel (2025+ layout)
    const lockup = obj.lockupViewModel as Record<string, unknown> | undefined;
    if (lockup && typeof lockup === 'object') {
      const contentId = lockup.contentId;
      const contentType = lockup.contentType;
      if (
        typeof contentId === 'string' &&
        VIDEO_ID_REGEX.test(contentId) &&
        (!contentType || contentType === 'LOCKUP_CONTENT_TYPE_VIDEO')
      ) {
        const meta = lockup.metadata as
          | {
              lockupMetadataViewModel?: {
                title?: { content?: string };
                metadata?: {
                  contentMetadataViewModel?: {
                    metadataRows?: Array<{
                      metadataParts?: Array<{ text?: { content?: string } }>;
                    }>;
                  };
                };
              };
            }
          | undefined;
        const title = meta?.lockupMetadataViewModel?.title?.content?.trim() || '';
        const rows =
          meta?.lockupMetadataViewModel?.metadata?.contentMetadataViewModel
            ?.metadataRows || [];
        const channel = rows[0]?.metadataParts?.[0]?.text?.content?.trim() || '';
        pushCandidate(contentId, title, channel, 'VIDEO');
      }
    }

    // Shorts renderers
    const reel = obj.reelItemRenderer as Record<string, unknown> | undefined;
    if (reel && typeof reel === 'object') {
      const vid = reel.videoId;
      const title = readTextField(reel.headline);
      pushCandidate(vid, title || 'YouTube Short', 'YouTube Shorts', 'SHORTS');
    }

    const shortsLockup = obj.shortsLockupViewModel as
      | Record<string, unknown>
      | undefined;
    if (shortsLockup && typeof shortsLockup === 'object') {
      const onTap = shortsLockup.onTap as
        | {
            innertubeCommand?: {
              reelWatchEndpoint?: { videoId?: string };
            };
          }
        | undefined;
      const vid = onTap?.innertubeCommand?.reelWatchEndpoint?.videoId;
      const acc = (shortsLockup.accessibilityText as string | undefined) || '';
      const title =
        (
          shortsLockup.overlayMetadata as
            | { primaryText?: { content?: string } }
            | undefined
        )?.primaryText?.content?.trim() ||
        acc.split(',')[0]?.trim() ||
        'YouTube Short';
      pushCandidate(vid, title, 'YouTube Shorts', 'SHORTS');
    }

    // Traverse child values in order so first-to-last search relevance is preserved
    const keys = Object.keys(obj);
    for (let i = keys.length - 1; i >= 0; i--) {
      const val = obj[keys[i]];
      if (val && typeof val === 'object') {
        stack.push(val);
      }
    }
  }

  return candidates;
}

function extractBalancedJsonAfterMarker(
  html: string,
  marker: string,
): unknown | null {
  let searchFrom = 0;
  while (searchFrom < html.length) {
    const idx = html.indexOf(marker, searchFrom);
    if (idx === -1) return null;
    const braceStart = html.indexOf('{', idx + marker.length);
    if (braceStart === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let endIdx = -1;

    for (let i = braceStart; i < html.length; i++) {
      const ch = html[i];
      if (inString) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inString = false;
        }
        continue;
      }
      if (ch === '"') {
        inString = true;
      } else if (ch === '{') {
        depth += 1;
      } else if (ch === '}') {
        depth -= 1;
        if (depth === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }

    if (endIdx > braceStart) {
      try {
        return JSON.parse(html.slice(braceStart, endIdx));
      } catch {
        // Try next occurrence if this snippet wasn't valid JSON
      }
    }
    searchFrom = idx + marker.length;
  }
  return null;
}

async function fetchInnerTubeSearch(
  query: string,
  params?: string,
): Promise<RawVideoCandidate[]> {
  try {
    const payload: Record<string, unknown> = {
      context: {
        client: {
          clientName: 'WEB',
          clientVersion: '2.20250101.00.00',
          hl: 'en',
          gl: 'US',
        },
      },
      query,
    };
    if (params) {
      payload.params = params;
    }

    const res = await fetch(
      'https://www.youtube.com/youtubei/v1/search?prettyPrint=false',
      {
        method: 'POST',
        signal: AbortSignal.timeout(5500),
        headers: {
          'Content-Type': 'application/json',
          Origin: 'https://www.youtube.com',
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        body: JSON.stringify(payload),
      },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as unknown;
    return extractCandidatesFromData(data);
  } catch {
    return [];
  }
}

async function fetchHtmlSearch(query: string): Promise<RawVideoCandidate[]> {
  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query,
    )}&sp=EgIQAQ%3D%3D`;
    const res = await fetch(ytUrl, {
      signal: AbortSignal.timeout(5500),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        Cookie: 'CONSENT=YES+cb.20210328-17-p0.en+FX+667; SOCS=CAI',
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    const parsed =
      extractBalancedJsonAfterMarker(html, 'var ytInitialData =') ||
      extractBalancedJsonAfterMarker(html, 'window["ytInitialData"] =') ||
      extractBalancedJsonAfterMarker(html, 'ytInitialData =');
    if (!parsed) return [];
    return extractCandidatesFromData(parsed);
  } catch {
    return [];
  }
}

async function checkOembedStatus(videoId: string): Promise<{
  status: 'ok' | 'blocked' | 'uncertain';
  title?: string;
  author?: string;
}> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      {
        signal: AbortSignal.timeout(3200),
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      },
    );
    if (res.ok) {
      const meta = (await res.json().catch(() => null)) as {
        title?: string;
        author_name?: string;
      } | null;
      return {
        status: 'ok',
        title: typeof meta?.title === 'string' ? meta.title : undefined,
        author:
          typeof meta?.author_name === 'string' ? meta.author_name : undefined,
      };
    }
    if (res.status === 401 || res.status === 403 || res.status === 404) {
      return { status: 'blocked' };
    }
    return { status: 'uncertain' };
  } catch {
    return { status: 'uncertain' };
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (!query) {
    return NextResponse.json({ results: [], source: 'empty' });
  }

  const directId = extractDirectVideoId(query);
  if (directId) {
    const oembed = await checkOembedStatus(directId);
    const directResult: YouTubeSearchResultItem = {
      videoId: directId,
      title: oembed.title || `YouTube Video (${directId})`,
      channel: oembed.author || 'YouTube Direct',
      duration: 'VIDEO',
      thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
      embedSrc: buildEmbedSrc(directId),
      embedVerified: oembed.status === 'ok',
    };
    return NextResponse.json({
      results: [directResult],
      source: 'direct',
    });
  }

  const cacheKey = query.toLowerCase();
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ results: cached.results, source: 'cache' });
  }

  try {
    // 1) Primary: InnerTube JSON API with Videos filter ('EgIQAQ==')
    let candidates = await fetchInnerTubeSearch(query, 'EgIQAQ==');

    // 2) Broaden search without filter if few video-only matches came back (catches Shorts/Live/Music/Niche)
    if (candidates.length < 6) {
      const broad = await fetchInnerTubeSearch(query);
      const seenIds = new Set(candidates.map((c) => c.videoId));
      for (const item of broad) {
        if (!seenIds.has(item.videoId)) {
          seenIds.add(item.videoId);
          candidates.push(item);
        }
      }
    }

    // 3) Resilient HTML ytInitialData fallback if InnerTube returned nothing
    if (candidates.length === 0) {
      candidates = await fetchHtmlSearch(query);
    }

    if (candidates.length === 0) {
      return NextResponse.json({ results: [], source: 'none' });
    }

    // Verify embeddability in parallel across up to 18 candidates
    const checks = await Promise.all(
      candidates.slice(0, 18).map(async (c) => ({
        candidate: c,
        check: await checkOembedStatus(c.videoId),
      })),
    );

    const verifiedItems: YouTubeSearchResultItem[] = [];
    const uncertainItems: YouTubeSearchResultItem[] = [];
    const blockedItems: YouTubeSearchResultItem[] = [];

    for (const { candidate, check } of checks) {
      const item: YouTubeSearchResultItem = {
        ...candidate,
        title: candidate.title || check.title || 'YouTube Video',
        channel: candidate.channel || check.author || 'YouTube',
        embedSrc: buildEmbedSrc(candidate.videoId),
        embedVerified: check.status === 'ok',
      };
      if (check.status === 'ok') {
        verifiedItems.push(item);
      } else if (check.status === 'uncertain') {
        uncertainItems.push(item);
      } else {
        blockedItems.push(item);
      }
    }

    const finalResults =
      verifiedItems.length > 0
        ? verifiedItems.slice(0, 12)
        : uncertainItems.length > 0
          ? uncertainItems.slice(0, 10)
          : blockedItems.slice(0, 6);

    if (verifiedItems.length > 0) {
      if (SEARCH_CACHE.size > 80) {
        const firstKey = SEARCH_CACHE.keys().next().value;
        if (firstKey) SEARCH_CACHE.delete(firstKey);
      }
      SEARCH_CACHE.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        results: finalResults,
      });
    }

    return NextResponse.json({
      results: finalResults,
      source: finalResults.length > 0 ? 'youtube' : 'none',
    });
  } catch {
    return NextResponse.json({ results: [], source: 'error' });
  }
}
