'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  FileVideo,
  Gamepad2,
  Loader2,
  Music,
  Newspaper,
  Pause,
  Play,
  Power,
  Radio,
  Repeat,
  Search,
  Square,
  Trees,
  Tv,
  Volume2,
  VolumeX,
  X,
  Youtube,
} from 'lucide-react';
import {
  TV_CHANNELS,
  TvChannelId,
  normalizeChannelId,
} from '@/game/systems/smartTvSystem';
import type { HUDStateSnapshot } from '@/game/types';

export interface YouTubeStreamSelection {
  videoId: string;
  title: string;
  channel: string;
  thumbnail?: string;
}

interface YouTubePreset extends YouTubeStreamSelection {
  label: string;
  keywords: string[];
}

// Verified embeddable fallback YouTube videos so keyword searches & quick channels always play reliably
const VERIFIED_YOUTUBE_PRESETS: YouTubePreset[] = [
  {
    label: 'Lo-Fi Radio',
    videoId: 'jfKfPfyJRdk',
    title: 'lofi hip hop radio - beats to relax/study to',
    channel: 'Lofi Girl',
    thumbnail: 'https://i.ytimg.com/vi/jfKfPfyJRdk/hqdefault.jpg',
    keywords: ['lofi', 'lo-fi', 'chill', 'beats', 'study', 'music', 'radio', 'relax'],
  },
  {
    label: 'Nature 4K',
    videoId: 'BHACKCNDMW8',
    title: 'Relaxing Nature & Tropical Wildlife 4K',
    channel: '4K Relaxation',
    thumbnail: 'https://i.ytimg.com/vi/BHACKCNDMW8/hqdefault.jpg',
    keywords: ['nature', 'wildlife', 'forest', 'island', 'jungle', 'animals', '4k', 'dinosaur'],
  },
  {
    label: 'Ocean Waves',
    videoId: 'Nep1qytq9JM',
    title: 'Tropical Ocean Waves & Island Beach Sounds',
    channel: 'Ocean Ambience',
    thumbnail: 'https://i.ytimg.com/vi/Nep1qytq9JM/hqdefault.jpg',
    keywords: ['ocean', 'beach', 'waves', 'water', 'sea', 'rain', 'ambient'],
  },
  {
    label: 'Fireplace',
    videoId: 'L_LUpnjgPso',
    title: 'Cozy Crackling Cabin Fireplace 4K',
    channel: 'Cozy Ambience',
    thumbnail: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg',
    keywords: ['fire', 'fireplace', 'campfire', 'cabin', 'cozy', 'night'],
  },
  {
    label: 'Gaming',
    videoId: 'jSJrZU5Xv9k',
    title: 'Retro Synthwave Arcade & Gaming Mix',
    channel: 'Synthwave Live',
    thumbnail: 'https://i.ytimg.com/vi/jSJrZU5Xv9k/hqdefault.jpg',
    keywords: ['gaming', 'game', 'minecraft', 'gta', 'arcade', 'gameplay', 'survival', 'guide'],
  },
  {
    label: 'Kitchen / Food',
    videoId: 'u8p3j0j2X2I',
    title: 'Island Campfire Cooking & Survival Kitchen',
    channel: 'Campfire Kitchen',
    thumbnail: 'https://i.ytimg.com/vi/u8p3j0j2X2I/hqdefault.jpg',
    keywords: ['kitchen', 'cooking', 'food', 'recipe', 'chef', 'steak', 'bbq'],
  },
];

function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;

  const patterns = [
    /(?:youtube\.com\/watch\?(?:.*&)?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/live\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
}

function normalizeThumbnailUrl(url: string | undefined, videoId: string): string {
  if (!url) return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (url.startsWith('//')) return `https:${url}`;
  return url;
}

function formatDurationSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

function findFallbackYouTubePresets(query: string): YouTubeStreamSelection[] {
  const q = query.trim().toLowerCase();
  if (!q) return VERIFIED_YOUTUBE_PRESETS;
  const words = q.split(/\s+/).filter(Boolean);
  const scored = VERIFIED_YOUTUBE_PRESETS.map((preset) => {
    let score = 0;
    for (const w of words) {
      if (preset.label.toLowerCase().includes(w)) score += 3;
      if (preset.title.toLowerCase().includes(w)) score += 2;
      if (preset.keywords.some((kw) => kw.includes(w) || w.includes(kw))) score += 4;
    }
    return { preset, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.preset);
}

interface TvPlayerModalProps {
  tvState?: HUDStateSnapshot['tvState'];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchResults?: YouTubeStreamSelection[];
  onSearchResultsChange?: (results: YouTubeStreamSelection[]) => void;
  searchStatus?: string;
  onSearchStatusChange?: (status: string) => void;
  onSelectChannel: (ch: TvChannelId) => void;
  onSelectYouTube?: (stream: YouTubeStreamSelection) => void;
  onTogglePower: () => void;
  onTogglePlayPause: () => void;
  onStop?: () => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  onNextChannel: () => void;
  onPrevChannel: () => void;
  onToggleAutoCycle: (enabled: boolean) => void;
  onLoadLocalVideo?: (file: File) => void;
  onDrawPreview?: (canvas: HTMLCanvasElement) => void;
  onClose: () => void;
}

function renderChannelIcon(id: TvChannelId) {
  switch (id) {
    case 1:
      return <Music className="w-4 h-4 text-purple-300 shrink-0" />;
    case 2:
      return <Newspaper className="w-4 h-4 text-red-300 shrink-0" />;
    case 3:
      return <Trees className="w-4 h-4 text-emerald-300 shrink-0" />;
    case 4:
      return <Gamepad2 className="w-4 h-4 text-cyan-300 shrink-0" />;
    case 5:
      return <Radio className="w-4 h-4 text-slate-300 shrink-0" />;
  }
}

export function TvPlayerModal({
  tvState,
  searchQuery: controlledSearchQuery,
  onSearchQueryChange,
  searchResults: controlledSearchResults,
  onSearchResultsChange,
  searchStatus: controlledSearchStatus,
  onSearchStatusChange,
  onSelectChannel,
  onSelectYouTube,
  onTogglePower,
  onTogglePlayPause,
  onStop,
  onSetVolume,
  onToggleMute,
  onNextChannel,
  onPrevChannel,
  onToggleAutoCycle,
  onLoadLocalVideo,
  onDrawPreview,
  onClose,
}: TvPlayerModalProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [localSearchResults, setLocalSearchResults] = useState<YouTubeStreamSelection[]>([]);
  const [localSearchStatus, setLocalSearchStatus] = useState<string>('');

  const searchQuery = controlledSearchQuery ?? localSearchQuery;
  const setSearchQuery = onSearchQueryChange ?? setLocalSearchQuery;
  const searchResults = controlledSearchResults ?? localSearchResults;
  const setSearchResults = onSearchResultsChange ?? setLocalSearchResults;
  const searchStatus = controlledSearchStatus ?? localSearchStatus;
  const setSearchStatus = onSearchStatusChange ?? setLocalSearchStatus;

  const isPowerOn = tvState ? tvState.power : true;
  const isPaused = tvState?.isPaused ?? false;
  const isStopped = tvState?.isStopped ?? false;
  const activeChannel = normalizeChannelId(tvState?.channel);
  const volume = tvState?.volume ?? 0.75;
  const isMuted = tvState?.isMuted ?? false;
  const autoCycle = tvState?.autoCycle ?? false;
  const isLocalVideo = tvState?.isLocalVideo ?? false;
  const localVideoName = tvState?.localVideoName || 'Custom Video';
  const isYouTubeActive = tvState?.isYouTubeActive ?? false;
  const youtubeVideoId = tvState?.youtubeVideoId || '';
  const youtubeTitle = tvState?.youtubeTitle || 'YouTube';
  const youtubeChannel = tvState?.youtubeChannel || 'YouTube';
  const currentTime = tvState?.currentTime ?? 0;
  const spatialVol = tvState?.spatialVolume ?? Math.round(volume * 100);
  const activeMeta =
    TV_CHANNELS.find((c) => c.id === activeChannel) || TV_CHANNELS[0];

  // Mirror the live Three.js CanvasTexture onto the Remote Monitor preview when not displaying YouTube
  useEffect(() => {
    if (!onDrawPreview || (isPowerOn && isYouTubeActive && youtubeVideoId)) return;
    let rafId = 0;
    const renderLoop = () => {
      if (previewCanvasRef.current) {
        onDrawPreview(previewCanvasRef.current);
      }
      rafId = window.requestAnimationFrame(renderLoop);
    };
    rafId = window.requestAnimationFrame(renderLoop);
    return () => window.cancelAnimationFrame(rafId);
  }, [onDrawPreview, isPowerOn, isYouTubeActive, youtubeVideoId]);

  const playYouTubeSelection = useCallback(
    (selection: YouTubeStreamSelection) => {
      onSelectYouTube?.(selection);
    },
    [onSelectYouTube],
  );

  const handleYouTubeSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = searchQuery.trim();
    if (!raw) {
      // Empty submit plays featured Lo-Fi stream
      playYouTubeSelection(VERIFIED_YOUTUBE_PRESETS[0]);
      setSearchStatus('Tuned to Lo-Fi Chill Radio');
      return;
    }

    const directId = extractYouTubeVideoId(raw);
    if (directId) {
      const directItem: YouTubeStreamSelection = {
        videoId: directId,
        title: `YouTube Video (${directId})`,
        channel: 'YouTube Direct',
        thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
      };
      setSearchResults([directItem]);
      playYouTubeSelection(directItem);
      setSearchStatus('Loaded direct YouTube link onto 3D TV');
      return;
    }

    setIsSearching(true);
    setSearchStatus(`Searching YouTube for "${raw}"...`);
    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(raw)}`,
      );
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{
            videoId: string;
            title: string;
            channel: string;
            thumbnail?: string;
          }>;
        };
        const apiResults = (data.results || []).map((item) => ({
          videoId: item.videoId,
          title: item.title,
          channel: item.channel,
          thumbnail: normalizeThumbnailUrl(item.thumbnail, item.videoId),
        }));
        if (apiResults.length > 0) {
          setSearchResults(apiResults);
          playYouTubeSelection(apiResults[0]);
          setSearchStatus(`Playing on 3D TV: ${apiResults[0].title}`);
          setIsSearching(false);
          return;
        }
      }
    } catch {
      // Fall through cleanly to verified curated matches
    }

    const fallbackMatches = findFallbackYouTubePresets(raw);
    setSearchResults(fallbackMatches);
    playYouTubeSelection(fallbackMatches[0]);
    setSearchStatus(`Playing curated YouTube match on 3D TV: ${fallbackMatches[0].title}`);
    setIsSearching(false);
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className="fixed inset-0 z-50 pointer-events-none flex flex-col justify-end sm:flex-row sm:items-stretch sm:justify-end p-2.5 sm:p-4"
    >
      <div className="w-full sm:w-[410px] max-h-[78vh] sm:max-h-full rounded-2xl bg-stone-950/95 backdrop-blur-md border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col pointer-events-auto">
        {/* Remote Header + Close (X) */}
        <div className="flex items-center justify-between gap-2.5 px-4 py-3 border-b border-stone-800 bg-stone-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${
                isPowerOn && isYouTubeActive
                  ? 'bg-red-500/20 border-red-500/40'
                  : 'bg-sky-500/15 border-sky-500/30'
              }`}
            >
              {isPowerOn && isYouTubeActive ? (
                <Youtube className="w-4 h-4 text-red-400" />
              ) : (
                <Tv className="w-4 h-4 text-sky-400" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display text-sm font-bold text-stone-100 truncate">
                  Smart TV Remote
                </h2>
                <span
                  className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded shrink-0 ${
                    !isPowerOn
                      ? 'bg-red-950/80 text-red-300 border border-red-700/60'
                      : isStopped
                        ? 'bg-stone-800 text-stone-300 border border-stone-600/60'
                        : isPaused
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : isYouTubeActive
                            ? 'bg-red-600/25 text-red-300 border border-red-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  {!isPowerOn
                    ? 'STANDBY'
                    : isStopped
                      ? 'STOPPED'
                      : isPaused
                        ? 'PAUSED'
                        : isYouTubeActive
                          ? 'YOUTUBE'
                          : 'ON · LIVE'}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {!isPowerOn
                  ? 'TV Powered Off · Tap Power or Play to turn on'
                  : isStopped
                    ? 'Playback Stopped · Pick a YouTube video or TV channel'
                    : isYouTubeActive
                      ? `${isPaused ? 'Paused · ' : ''}${youtubeTitle}`
                      : isLocalVideo
                        ? `${isPaused ? 'Paused · ' : ''}Video · ${localVideoName}`
                        : isPaused
                          ? `Paused · CH ${activeChannel}: ${activeMeta.name}`
                          : `CH ${activeChannel} · ${activeMeta.name}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] px-3 rounded-xl bg-stone-800 hover:bg-stone-700 active:bg-stone-600 border border-stone-600 text-stone-100 font-semibold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors"
            aria-label="Close TV Remote"
            title="Hide remote overlay and keep TV playing"
          >
            <X className="w-5 h-5" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>

        {/* Scrollable Remote Deck */}
        <div className="p-3.5 sm:p-4 overflow-y-auto survival-scroll space-y-3.5 flex-1">
          {/* Remote Status Monitor (Mirrors 3D TV state without mounting a second video player) */}
          <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-stone-700/80 bg-stone-950 shadow-inner">
            {isPowerOn && isYouTubeActive && youtubeVideoId ? (
              <div className="relative w-full h-full bg-stone-950">
                <Image
                  src={`https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                  alt={youtubeTitle}
                  fill
                  sizes="400px"
                  referrerPolicy="no-referrer"
                  className="object-cover opacity-55"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950 via-stone-950/50 to-stone-950/60 p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                        isPaused
                          ? 'bg-amber-950/90 border-amber-500/50 text-amber-300'
                          : 'bg-red-600/90 border-red-400/60 text-white'
                      }`}
                    >
                      {isPaused ? 'Paused on 3D TV' : 'Playing on 3D TV'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-stone-950/85 border border-stone-700 text-[10px] font-mono-tabular text-stone-200">
                      {formatDurationSeconds(currentTime)} · {isMuted ? 'MUTED' : `VOL ${spatialVol}%`}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-stone-50 line-clamp-2 leading-snug">
                      {youtubeTitle}
                    </p>
                    <p className="text-[11px] text-red-300 truncate mt-0.5">
                      {youtubeChannel}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <canvas
                ref={previewCanvasRef}
                width={512}
                height={288}
                className="w-full h-full block object-cover"
              />
            )}
            {!isPowerOn && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="px-3 py-1 rounded-lg bg-stone-950/80 border border-red-700/60 text-[11px] font-mono-tabular font-bold text-red-300">
                  STANDBY
                </span>
              </div>
            )}
          </div>

          {/* YOUTUBE SEARCH & QUICK CHANNELS */}
          {onSelectYouTube && (
            <div className="rounded-xl bg-stone-900/90 border border-red-900/40 p-2.5 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Youtube className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-stone-200">
                    YouTube Smart Player
                  </span>
                </div>
                {isPowerOn && isYouTubeActive && (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-red-500/20 border border-red-500/40 text-red-300">
                    Active
                  </span>
                )}
              </div>

              <form onSubmit={handleYouTubeSearchSubmit} className="flex gap-1.5">
                <div className="relative flex-1 min-w-0">
                  <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search YouTube or paste URL..."
                    className="w-full min-h-[44px] pl-8 pr-2.5 rounded-xl bg-stone-950 border border-stone-700 focus:border-red-500 focus:outline-none text-xs text-stone-100 placeholder:text-stone-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching}
                  className="min-h-[44px] px-3 rounded-xl bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:opacity-60 text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-sm"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-3.5 h-3.5 fill-current" />
                  )}
                  <span>Watch on TV</span>
                </button>
              </form>

              {/* Quick Verified YouTube Channels */}
              <div className="flex flex-wrap gap-1.5">
                {VERIFIED_YOUTUBE_PRESETS.map((preset) => {
                  const selected =
                    isPowerOn && isYouTubeActive && youtubeVideoId === preset.videoId;
                  return (
                    <button
                      key={preset.videoId}
                      type="button"
                      onClick={() => {
                        playYouTubeSelection(preset);
                        setSearchStatus(`Playing ${preset.label} on 3D TV`);
                      }}
                      className={`min-h-[34px] px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-colors ${
                        selected
                          ? 'bg-red-600 border-red-400 text-white shadow-sm'
                          : 'bg-stone-950 hover:bg-stone-800 border-stone-700/80 text-stone-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {searchStatus && (
                <p className="text-[11px] text-stone-400 truncate">
                  {searchStatus}
                </p>
              )}

              {/* Search Results Strip */}
              {searchResults.length > 0 && (
                <div className="space-y-1.5 max-h-40 overflow-y-auto survival-scroll pr-0.5">
                  {searchResults.map((item) => {
                    const selected =
                      isPowerOn && isYouTubeActive && youtubeVideoId === item.videoId;
                    return (
                      <button
                        key={item.videoId}
                        type="button"
                        onClick={() => {
                          playYouTubeSelection(item);
                          setSearchStatus(`Playing on 3D TV: ${item.title}`);
                        }}
                        className={`w-full p-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                          selected
                            ? 'bg-red-950/60 border-red-500 text-stone-50'
                            : 'bg-stone-950/80 hover:bg-stone-900 border-stone-800 text-stone-200'
                        }`}
                      >
                        <div className="relative w-16 h-10 rounded-lg overflow-hidden bg-stone-900 shrink-0">
                          <Image
                            src={normalizeThumbnailUrl(item.thumbnail, item.videoId)}
                            alt={item.title}
                            fill
                            sizes="64px"
                            referrerPolicy="no-referrer"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold truncate">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate">
                            {item.channel}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Primary TV Controls: Power, Play/Pause, Stop, Prev/Next CH, Auto-Cycle */}
          <div className="rounded-xl bg-stone-900/80 border border-stone-800 p-2.5 space-y-2">
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={onTogglePower}
                className={`min-h-[44px] px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
                  isPowerOn
                    ? 'bg-red-950/60 hover:bg-red-900/70 border-red-600/60 text-red-200'
                    : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white'
                }`}
              >
                <Power className="w-4 h-4 shrink-0" />
                <span>{isPowerOn ? 'Off' : 'On'}</span>
              </button>

              <button
                type="button"
                onClick={onTogglePlayPause}
                aria-label={!isPowerOn || isPaused ? 'Play 3D TV' : 'Pause 3D TV'}
                className={`min-h-[44px] px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm ${
                  !isPowerOn || isPaused
                    ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-400/70 text-amber-200'
                }`}
              >
                {!isPowerOn || isPaused ? (
                  <>
                    <Play className="w-4 h-4 fill-current shrink-0" />
                    <span>Play</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-4 h-4 fill-current shrink-0" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  onStop?.();
                  setSearchStatus('Playback stopped');
                }}
                disabled={!isPowerOn || isStopped}
                aria-label="Stop 3D TV Playback"
                className="min-h-[44px] px-2.5 rounded-xl border border-stone-700 bg-stone-950 hover:bg-stone-800 disabled:opacity-45 text-stone-100 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current shrink-0" />
                <span>Stop</span>
              </button>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={onPrevChannel}
                className="min-h-[44px] px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>CH -</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleAutoCycle(!autoCycle)}
                className={`min-h-[44px] px-2 rounded-xl border text-[11px] font-semibold flex items-center justify-center gap-1 transition-colors ${
                  autoCycle
                    ? 'bg-sky-950/60 border-sky-500/60 text-sky-200'
                    : 'bg-stone-950 border-stone-700 text-stone-300'
                }`}
                title={
                  autoCycle
                    ? 'Auto-surfing channels every 45s'
                    : 'Looping selected channel'
                }
              >
                <Repeat className="w-3.5 h-3.5" />
                <span>{autoCycle ? 'Surf On' : 'Loop CH'}</span>
              </button>

              <button
                type="button"
                onClick={onNextChannel}
                className="min-h-[44px] px-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-stone-600 text-stone-100 text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
              >
                <span>CH +</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Custom Local Video Input (1280x720 CanvasTexture Renderer) */}
          {onLoadLocalVideo && (
            <div className="rounded-xl bg-stone-900/80 border border-stone-800 p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
                  Play Video File on 3D TV
                </span>
                {isPowerOn && isLocalVideo && (
                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 truncate max-w-[140px]">
                    {localVideoName}
                  </span>
                )}
              </div>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime,video/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onLoadLocalVideo(file);
                    e.target.value = '';
                  }
                }}
              />
              <button
                type="button"
                onClick={() => videoInputRef.current?.click()}
                className={`w-full min-h-[44px] px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                  isPowerOn && isLocalVideo
                    ? 'bg-sky-950/65 border-sky-400 text-sky-100'
                    : 'bg-stone-800 hover:bg-stone-700 border-stone-600 text-stone-100'
                }`}
              >
                <FileVideo className="w-4 h-4 text-sky-400 shrink-0" />
                <span>
                  {isPowerOn && isLocalVideo
                    ? 'Switch Video File (MP4 / WebM)'
                    : 'Load Video File (MP4 / WebM)'}
                </span>
              </button>
            </div>
          )}

          {/* 5 Native Animated Looping Channels */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-stone-400">
              TV Channels (5 Live 3D Broadcasts)
            </div>
            <div className="space-y-1.5">
              {TV_CHANNELS.map((ch) => {
                const selected =
                  isPowerOn &&
                  !isStopped &&
                  !isLocalVideo &&
                  !isYouTubeActive &&
                  activeChannel === ch.id;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => onSelectChannel(ch.id)}
                    className={`w-full min-h-[54px] px-3 py-2 rounded-xl border text-left flex items-center gap-3 transition-colors ${
                      selected
                        ? 'bg-sky-950/65 border-sky-400 text-sky-50 shadow-md'
                        : 'bg-stone-900/80 border-stone-800 hover:border-stone-600 text-stone-200'
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border border-white/10"
                      style={{ backgroundColor: `${ch.color}28` }}
                    >
                      {renderChannelIcon(ch.id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate">{ch.name}</span>
                        <span
                          className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded text-white shrink-0"
                          style={{ backgroundColor: ch.color }}
                        >
                          CH {ch.id}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 truncate mt-0.5">
                        {ch.tagline}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Audio & Hide Remote Footer */}
        <div className="p-3 border-t border-stone-800 bg-stone-900/90 space-y-2.5 shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleMute}
              className="min-h-[44px] px-3 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-200 font-semibold text-xs flex items-center gap-1.5 shrink-0 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-red-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-sky-400" />
              )}
              <span>{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>
            <label className="min-h-[44px] flex-1 px-3 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between gap-2 text-xs text-stone-300">
              <span className="font-mono-tabular text-[11px] text-stone-400 shrink-0">
                Vol {Math.round(volume * 100)}%
              </span>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(volume * 100)}
                onChange={(e) => onSetVolume(Number(e.target.value) / 100)}
                className="w-full max-w-[140px] accent-sky-500 cursor-pointer"
                aria-label="3D TV Volume"
              />
            </label>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Hide Remote (Keep TV Playing)</span>
          </button>
        </div>
      </div>
    </div>
  );
}

