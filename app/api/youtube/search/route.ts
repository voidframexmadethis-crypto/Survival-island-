import { NextRequest, NextResponse } from 'next/server';

export interface YouTubeSearchResultItem {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
  embedSrc: string;
}

const SEARCH_CACHE = new Map<
  string,
  { expiresAt: number; results: YouTubeSearchResultItem[] }
>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function buildEmbedSrc(videoId: string): string {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    playsinline: '1',
    enablejsapi: '1',
  });
  return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
}

interface RawVideoCandidate {
  videoId: string;
  title: string;
  channel: string;
  duration: string;
  thumbnail: string;
}

function extractVideosFromHtml(html: string): RawVideoCandidate[] {
  const match = html.match(/var ytInitialData = (\{[\s\S]+?\});<\/script>/);
  if (!match?.[1]) return [];

  let data: unknown;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const root = data as {
    contents?: {
      twoColumnSearchResultsRenderer?: {
        primaryContents?: {
          sectionListRenderer?: {
            contents?: Array<{
              itemSectionRenderer?: {
                contents?: Array<{
                  videoRenderer?: {
                    videoId?: string;
                    title?: { runs?: Array<{ text?: string }>; simpleText?: string };
                    ownerText?: { runs?: Array<{ text?: string }> };
                    lengthText?: { simpleText?: string };
                    badges?: Array<{
                      metadataBadgeRenderer?: { style?: string; label?: string };
                    }>;
                    thumbnail?: { thumbnails?: Array<{ url?: string }> };
                  };
                }>;
              };
            }>;
          };
        };
      };
    };
  };

  const sections =
    root?.contents?.twoColumnSearchResultsRenderer?.primaryContents
      ?.sectionListRenderer?.contents || [];

  const seen = new Set<string>();
  const candidates: RawVideoCandidate[] = [];

  for (const sec of sections) {
    const items = sec?.itemSectionRenderer?.contents || [];
    for (const entry of items) {
      const v = entry?.videoRenderer;
      const vid = v?.videoId;
      if (!vid || !/^[a-zA-Z0-9_-]{11}$/.test(vid) || seen.has(vid)) continue;
      seen.add(vid);

      const title =
        v.title?.runs?.map((r) => r.text || '').join('').trim() ||
        v.title?.simpleText?.trim() ||
        'YouTube Video';
      const channel = v.ownerText?.runs?.[0]?.text?.trim() || 'YouTube';
      const isLive = Boolean(
        v.badges?.some(
          (b) =>
            b.metadataBadgeRenderer?.style === 'BADGE_STYLE_TYPE_LIVE_NOW' ||
            b.metadataBadgeRenderer?.label === 'LIVE',
        ),
      );
      const duration = v.lengthText?.simpleText?.trim() || (isLive ? 'LIVE' : 'VIDEO');
      const thumbs = v.thumbnail?.thumbnails || [];
      const thumbnail =
        thumbs[thumbs.length - 1]?.url || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

      candidates.push({ videoId: vid, title, channel, duration, thumbnail });
      if (candidates.length >= 14) break;
    }
    if (candidates.length >= 14) break;
  }

  return candidates;
}

async function isEmbeddableViaOembed(videoId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${videoId}`,
      )}&format=json`,
      {
        signal: AbortSignal.timeout(2200),
        headers: {
          'User-Agent': 'Mozilla/5.0',
        },
      },
    );
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get('q')?.trim() || '';
  if (!query) {
    return NextResponse.json({ results: [], source: 'empty' });
  }

  const cacheKey = query.toLowerCase();
  const cached = SEARCH_CACHE.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({ results: cached.results, source: 'cache' });
  }

  try {
    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
      query,
    )}&sp=EgIQAQ%253D%253D`;

    const res = await fetch(ytUrl, {
      signal: AbortSignal.timeout(5500),
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ results: [], source: 'unavailable' });
    }

    const html = await res.text();
    const candidates = extractVideosFromHtml(html);
    if (candidates.length === 0) {
      return NextResponse.json({ results: [], source: 'none' });
    }

    // Verify embeddability in parallel so no "Video unavailable" / restricted videos slip in
    const checks = await Promise.all(
      candidates.slice(0, 10).map(async (c) => ({
        candidate: c,
        ok: await isEmbeddableViaOembed(c.videoId),
      })),
    );

    const verified = checks
      .filter((x) => x.ok)
      .slice(0, 8)
      .map(({ candidate }) => ({
        ...candidate,
        embedSrc: buildEmbedSrc(candidate.videoId),
      }));

    if (verified.length > 0) {
      if (SEARCH_CACHE.size > 60) {
        const firstKey = SEARCH_CACHE.keys().next().value;
        if (firstKey) SEARCH_CACHE.delete(firstKey);
      }
      SEARCH_CACHE.set(cacheKey, {
        expiresAt: Date.now() + CACHE_TTL_MS,
        results: verified,
      });
    }

    return NextResponse.json({
      results: verified,
      source: verified.length > 0 ? 'youtube' : 'none',
    });
  } catch {
    return NextResponse.json({ results: [], source: 'error' });
  }
}
