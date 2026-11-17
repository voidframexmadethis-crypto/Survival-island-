'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileVideo,
  Gamepad2,
  Loader2,
  Maximize2,
  Minimize2,
  Monitor,
  Music,
  Newspaper,
  Pause,
  Play,
  Power,
  Radio,
  Repeat,
  Search,
  Shield,
  SkipForward,
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
import type { HUDStateSnapshot, TvSafetyMode } from '@/game/types';

export interface YouTubeStreamSelection {
  videoId: string;
  title: string;
  channel: string;
  thumbnail?: string;
  duration?: string;
  embedVerified?: boolean;
}

interface YouTubePreset extends YouTubeStreamSelection {
  label: string;
}

// Verified embeddable quick-start channels for 1-tap tuning
const VERIFIED_YOUTUBE_PRESETS: YouTubePreset[] = [
  {
    label: 'Lo-Fi Radio',
    videoId: 'n61ULEU7CO0',
    title: 'Best of lofi hip hop 2021 [beats to relax/study to]',
    channel: 'Lofi Girl',
    duration: 'VIDEO',
    thumbnail: 'https://i.ytimg.com/vi/n61ULEU7CO0/hqdefault.jpg',
  },
  {
    label: 'Nature 4K',
    videoId: 'BHACKCNDMW8',
    title: 'Relaxing Nature & Tropical Wildlife 4K',
    channel: '4K Relaxation',
    duration: 'VIDEO',
    thumbnail: 'https://i.ytimg.com/vi/BHACKCNDMW8/hqdefault.jpg',
  },
  {
    label: 'Ocean Waves',
    videoId: 'Nep1qytq9JM',
    title: 'Tropical Ocean Waves & Island Beach Sounds',
    channel: 'Ocean Ambience',
    duration: 'VIDEO',
    thumbnail: 'https://i.ytimg.com/vi/Nep1qytq9JM/hqdefault.jpg',
  },
  {
    label: 'Fireplace',
    videoId: 'L_LUpnjgPso',
    title: 'Cozy Crackling Cabin Fireplace 4K',
    channel: 'Cozy Ambience',
    duration: 'VIDEO',
    thumbnail: 'https://i.ytimg.com/vi/L_LUpnjgPso/hqdefault.jpg',
  },
  {
    label: 'Synthwave',
    videoId: '48z-lzkyICo',
    title: 'BACK TO 1982 [Synthwave - Retrowave Mix]',
    channel: 'VISION84',
    duration: 'VIDEO',
    thumbnail: 'https://i.ytimg.com/vi/48z-lzkyICo/hqdefault.jpg',
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
    /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
}

function normalizeThumbnailUrl(url: string | undefined, videoId: string): string {
  const fallback = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  if (!url) return fallback;
  const normalized = url.startsWith('//') ? `https:${url}` : url;
  if (/^https:\/\/[a-z0-9-]+\.ytimg\.com\//i.test(normalized)) {
    return normalized;
  }
  return fallback;
}

function formatDurationSeconds(sec: number): string {
  const safe = Math.max(0, Math.floor(sec));
  const mins = Math.floor(safe / 60);
  const rem = safe % 60;
  return `${mins}:${rem.toString().padStart(2, '0')}`;
}

interface TvPlayerModalProps {
  tvState?: HUDStateSnapshot['tvState'];
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
  searchResults?: YouTubeStreamSelection[];
  onSearchResultsChange?: (results: YouTubeStreamSelection[]) => void;
  searchStatus?: string;
  onSearchStatusChange?: (status: string) => void;
  viewMode?: 'inline' | 'world3d';
  onViewModeChange?: (mode: 'inline' | 'world3d') => void;
  onInlineSlotChange?: (el: HTMLElement | null) => void;
  onSelectChannel: (ch: TvChannelId) => void;
  onSelectYouTube?: (stream: YouTubeStreamSelection, startSec?: number) => void;
  onInlinePlayerChange?: (active: boolean, syncTimeSec?: number) => void;
  youtubeErrorSignal?: { videoId: string; code: number; seq: number } | null;
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
  tvSafetyMode?: TvSafetyMode;
  effectiveTvSafetyMode?: TvSafetyMode;
  onChangeTvSafetyMode?: (mode: TvSafetyMode) => void;
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
  viewMode: controlledViewMode,
  onViewModeChange,
  onInlineSlotChange,
  onSelectChannel,
  onSelectYouTube,
  onInlinePlayerChange,
  youtubeErrorSignal,
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
  tvSafetyMode,
  effectiveTvSafetyMode,
  onChangeTvSafetyMode,
  onClose,
}: TvPlayerModalProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const searchAbortRef = useRef<AbortController | null>(null);

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [localSearchResults, setLocalSearchResults] = useState<
    YouTubeStreamSelection[]
  >([]);
  const [localSearchStatus, setLocalSearchStatus] = useState<string>('');
  const [localViewMode, setLocalViewMode] = useState<'inline' | 'world3d'>('inline');
  const [expandedTheater, setExpandedTheater] = useState(false);
  const [restrictedNoticeState, setRestrictedNoticeState] = useState<{
    videoId: string;
    text: string;
  } | null>(null);

  const triedFailedIdsRef = useRef<Set<string>>(new Set());

  const searchQuery = controlledSearchQuery ?? localSearchQuery;
  const setSearchQuery = onSearchQueryChange ?? setLocalSearchQuery;
  const searchResults = controlledSearchResults ?? localSearchResults;
  const setSearchResults = onSearchResultsChange ?? setLocalSearchResults;
  const searchStatus = controlledSearchStatus ?? localSearchStatus;
  const setSearchStatus = onSearchStatusChange ?? setLocalSearchStatus;
  const resolvedSafetyMode: TvSafetyMode =
    tvSafetyMode ?? tvState?.safetyMode ?? 'auto';
  const resolvedEffectiveSafety: TvSafetyMode =
    effectiveTvSafetyMode ?? tvState?.effectiveSafetyMode ?? resolvedSafetyMode;
  const rawViewMode = controlledViewMode ?? localViewMode;
  const viewMode: 'inline' | 'world3d' =
    resolvedEffectiveSafety === 'safe_mini' ? 'inline' : rawViewMode;
  const setViewMode = onViewModeChange ?? setLocalViewMode;

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

  const embedRestrictedNotice =
    youtubeVideoId && restrictedNoticeState?.videoId === youtubeVideoId
      ? restrictedNoticeState.text
      : '';

  const showInlineYouTube =
    viewMode === 'inline' &&
    isPowerOn &&
    !isStopped &&
    isYouTubeActive &&
    Boolean(youtubeVideoId);

  const setInlineSlotRef = useCallback(
    (el: HTMLDivElement | null) => {
      onInlineSlotChange?.(el);
    },
    [onInlineSlotChange],
  );

  // Keep engine informed whether the inline modal player owns the YouTube display slot
  useEffect(() => {
    onInlinePlayerChange?.(showInlineYouTube);
  }, [showInlineYouTube, onInlinePlayerChange]);

  // Ensure handoff back to 3D Wall TV / Floating PiP and abort pending fetches whenever modal closes/unmounts
  useEffect(() => {
    return () => {
      searchAbortRef.current?.abort();
      searchAbortRef.current = null;
      onInlineSlotChange?.(null);
      onInlinePlayerChange?.(false);
    };
  }, [onInlineSlotChange, onInlinePlayerChange]);

  const playYouTubeSelection = useCallback(
    (selection: YouTubeStreamSelection, startSec = 0) => {
      setRestrictedNoticeState(null);
      onSelectYouTube?.(selection, startSec);
    },
    [onSelectYouTube],
  );

  const tryNextPlayableResult = useCallback(
    (failedVideoId: string, errorCode?: number) => {
      triedFailedIdsRef.current.add(failedVideoId);
      const nextCandidate = searchResults.find(
        (item) =>
          item.videoId !== failedVideoId &&
          !triedFailedIdsRef.current.has(item.videoId),
      );
      if (nextCandidate) {
        setSearchStatus(
          `Skipped restricted clip · Playing: ${nextCandidate.title}`,
        );
        playYouTubeSelection(nextCandidate, 0);
        return true;
      }
      setRestrictedNoticeState({
        videoId: failedVideoId,
        text:
          errorCode === 101 || errorCode === 150
            ? 'Video owner disabled embedded playback. Pick another result or open directly on YouTube.'
            : 'YouTube player could not load this clip. Try another result or open directly on YouTube.',
      });
      return false;
    },
    [searchResults, setSearchStatus, playYouTubeSelection],
  );

  // Handle 3D Wall TV YouTube errors forwarded from GameEngine
  useEffect(() => {
    if (!youtubeErrorSignal) return;
    if (youtubeErrorSignal.videoId === youtubeVideoId) {
      const id = window.setTimeout(() => {
        tryNextPlayableResult(youtubeErrorSignal.videoId, youtubeErrorSignal.code);
      }, 0);
      return () => window.clearTimeout(id);
    }
  }, [youtubeErrorSignal, youtubeVideoId, tryNextPlayableResult]);

  // Mirror Three.js CanvasTexture onto Monitor preview at a steady 15 FPS to keep GPU usage low
  useEffect(() => {
    if (!onDrawPreview || showInlineYouTube) return;
    let rafId = 0;
    let lastDrawMs = 0;
    const renderLoop = (now: number) => {
      if (now - lastDrawMs >= 66) {
        lastDrawMs = now;
        if (previewCanvasRef.current) {
          onDrawPreview(previewCanvasRef.current);
        }
      }
      rafId = window.requestAnimationFrame(renderLoop);
    };
    rafId = window.requestAnimationFrame(renderLoop);
    return () => window.cancelAnimationFrame(rafId);
  }, [onDrawPreview, showInlineYouTube]);

  const handleToggleViewMode = () => {
    if (resolvedEffectiveSafety === 'safe_mini') {
      setViewMode('inline');
      setSearchStatus('Safe Mini-TV active — floating Mini-TV plays when exiting remote');
      return;
    }
    if (viewMode === 'inline') {
      onInlinePlayerChange?.(false);
      setViewMode('world3d');
      setExpandedTheater(false);
    } else {
      setViewMode('inline');
    }
  };

  const handleCycleSafetyMode = () => {
    if (!onChangeTvSafetyMode) return;
    const next: TvSafetyMode =
      resolvedSafetyMode === 'auto'
        ? 'safe_mini'
        : resolvedSafetyMode === 'safe_mini'
          ? 'full_3d'
          : 'auto';
    onChangeTvSafetyMode(next);
    if (next === 'safe_mini') {
      setViewMode('inline');
      setSearchStatus('Safe Mini-TV enabled — prevents 3D Wall TV crashes');
    } else if (next === 'full_3d') {
      setSearchStatus('Full 3D Wall TV enabled');
    } else {
      setSearchStatus('TV Auto-Protection enabled');
    }
  };

  const handleYouTubeSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = searchQuery.trim();
    if (!raw) {
      playYouTubeSelection(VERIFIED_YOUTUBE_PRESETS[0], 0);
      setSearchStatus('Tuned to Lo-Fi Chill Radio');
      return;
    }

    searchAbortRef.current?.abort();
    const controller = new AbortController();
    searchAbortRef.current = controller;

    triedFailedIdsRef.current.clear();
    setRestrictedNoticeState(null);

    const directId = extractYouTubeVideoId(raw);
    setIsSearching(true);
    setSearchStatus(
      directId
        ? 'Loading YouTube video...'
        : `Searching YouTube for "${raw}"...`,
    );

    try {
      const res = await fetch(
        `/api/youtube/search?q=${encodeURIComponent(raw)}`,
        { signal: controller.signal },
      );
      if (res.ok) {
        const data = (await res.json()) as {
          results?: Array<{
            videoId: string;
            title: string;
            channel: string;
            duration?: string;
            thumbnail?: string;
            embedVerified?: boolean;
          }>;
        };
        const apiResults: YouTubeStreamSelection[] = (data.results || []).map(
          (item) => ({
            videoId: item.videoId,
            title: item.title,
            channel: item.channel,
            duration: item.duration,
            embedVerified: item.embedVerified,
            thumbnail: normalizeThumbnailUrl(item.thumbnail, item.videoId),
          }),
        );
        if (apiResults.length > 0) {
          setSearchResults(apiResults);
          setViewMode('inline');
          playYouTubeSelection(apiResults[0], 0);
          setSearchStatus(`Playing: ${apiResults[0].title}`);
          setIsSearching(false);
          return;
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      // Handled below
    }

    // If user pasted a direct URL/ID and metadata fetch failed, still play the video ID directly!
    if (directId) {
      const directItem: YouTubeStreamSelection = {
        videoId: directId,
        title: `YouTube Video (${directId})`,
        channel: 'YouTube Direct',
        duration: 'VIDEO',
        thumbnail: `https://i.ytimg.com/vi/${directId}/hqdefault.jpg`,
      };
      setSearchResults([directItem]);
      setViewMode('inline');
      playYouTubeSelection(directItem, 0);
      setSearchStatus('Loaded direct YouTube link');
      setIsSearching(false);
      return;
    }

    setSearchResults([]);
    setSearchStatus(
      `No playable YouTube videos found for "${raw}". Try another search or paste any YouTube link.`,
    );
    setIsSearching(false);
  };

  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      className={`fixed inset-0 z-50 flex ${
        expandedTheater
          ? 'items-center justify-center bg-black/75 p-2 sm:p-5 pointer-events-auto'
          : 'flex-col justify-end sm:flex-row sm:items-stretch sm:justify-end p-2.5 sm:p-4 pointer-events-none'
      }`}
    >
      <div
        className={`${
          expandedTheater
            ? 'w-full max-w-3xl max-h-[92vh]'
            : 'w-full sm:w-[430px] max-h-[82vh] sm:max-h-full'
        } rounded-2xl bg-stone-950/95 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col pointer-events-auto transition-all duration-200`}
      >
        {/* Remote Header + Close (X) */}
        <div className="flex items-center justify-between gap-2.5 px-4 py-3 border-b border-stone-800 bg-stone-900/95 shrink-0">
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

            <div className="flex items-center gap-1.5 shrink-0">
              {onChangeTvSafetyMode && (
                <button
                  type="button"
                  onClick={handleCycleSafetyMode}
                  className={`min-h-[36px] px-2.5 rounded-xl border text-[10px] font-bold flex items-center gap-1 transition-colors ${
                    resolvedEffectiveSafety === 'safe_mini'
                      ? 'bg-emerald-950/70 hover:bg-emerald-900/70 border-emerald-500/60 text-emerald-200'
                      : resolvedSafetyMode === 'full_3d'
                        ? 'bg-sky-950/70 hover:bg-sky-900/70 border-sky-500/50 text-sky-200'
                        : 'bg-stone-800 hover:bg-stone-700 border-stone-600 text-stone-200'
                  }`}
                  title="Cycle Smart TV Stability Mode: Auto-Protected, Safe Mini-TV, or Full 3D Wall"
                >
                  <Shield className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {resolvedSafetyMode === 'safe_mini'
                      ? 'Safe Mini'
                      : resolvedSafetyMode === 'full_3d'
                        ? '3D Wall'
                        : resolvedEffectiveSafety === 'safe_mini'
                          ? 'Auto: Mini'
                          : 'Auto Safe'}
                  </span>
                </button>
              )}

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
        </div>

        {/* Scrollable Remote Deck */}
        <div className="p-3.5 sm:p-4 overflow-y-auto survival-scroll space-y-3.5 flex-1">
          {/* Smart TV Screen: Live YouTube Player OR 3D Wall TV Preview */}
          <div className="space-y-1.5">
            {isPowerOn && isYouTubeActive && youtubeVideoId && !isStopped && (
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="px-2 py-0.5 rounded-md bg-red-600/20 border border-red-500/40 text-red-300 font-bold uppercase text-[10px] shrink-0">
                    {viewMode === 'inline' ? 'TV Screen' : '3D Wall TV'}
                  </span>
                  <span className="text-stone-400 truncate font-mono-tabular">
                    {formatDurationSeconds(currentTime)} ·{' '}
                    {isMuted
                      ? 'MUTED'
                      : `VOL ${viewMode === 'inline' ? Math.round(volume * 100) : spatialVol}%`}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleViewMode}
                    disabled={resolvedEffectiveSafety === 'safe_mini'}
                    className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-55 border border-stone-700 text-stone-200 font-semibold text-[10px] flex items-center gap-1 transition-colors"
                    title={
                      resolvedEffectiveSafety === 'safe_mini'
                        ? 'Safe Mini-TV active — switches to Floating Mini-TV when exiting remote'
                        : viewMode === 'inline'
                          ? 'Preview on the 3D wall TV inside your base'
                          : 'Watch directly on the Smart TV screen here'
                    }
                  >
                    <Monitor className="w-3 h-3 text-sky-400" />
                    <span>
                      {resolvedEffectiveSafety === 'safe_mini'
                        ? 'Mini-TV Safe'
                        : viewMode === 'inline'
                          ? '3D Wall'
                          : 'TV Screen'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (viewMode !== 'inline') {
                        setViewMode('inline');
                      }
                      setExpandedTheater((v) => !v);
                    }}
                    className="px-2 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 font-semibold text-[10px] flex items-center gap-1 transition-colors"
                    title={expandedTheater ? 'Compact Drawer' : 'Expand Theater View'}
                  >
                    {expandedTheater ? (
                      <>
                        <Minimize2 className="w-3 h-3 text-amber-400" />
                        <span>Compact</span>
                      </>
                    ) : (
                      <>
                        <Maximize2 className="w-3 h-3 text-amber-400" />
                        <span>Theater</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            <div className="relative w-full aspect-video rounded-xl overflow-hidden border border-stone-700/80 bg-black shadow-inner">
              {showInlineYouTube ? (
                <div
                  ref={setInlineSlotRef}
                  data-testid="tv-inline-video-slot"
                  className="w-full h-full bg-black flex items-center justify-center"
                >
                  <span className="text-[11px] text-stone-500 font-mono-tabular">
                    Connecting TV Video Stream...
                  </span>
                </div>
              ) : isPowerOn && isYouTubeActive && youtubeVideoId && !isStopped ? (
                <div className="relative w-full h-full bg-stone-950">
                  <Image
                    src={`https://i.ytimg.com/vi/${youtubeVideoId}/hqdefault.jpg`}
                    alt={youtubeTitle}
                    fill
                    sizes="420px"
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
                        {isPaused ? 'Paused on 3D TV' : 'Playing on 3D Wall TV'}
                      </span>
                      <button
                        type="button"
                        onClick={handleToggleViewMode}
                        className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[10px] font-bold flex items-center gap-1 shadow"
                      >
                        <Play className="w-3 h-3 fill-current" />
                        <span>Watch on Screen</span>
                      </button>
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

            {/* Helpful fallback bar ONLY if YouTube itself reports an embed restriction */}
            {embedRestrictedNotice && youtubeVideoId && (
              <div className="rounded-xl bg-amber-950/70 border border-amber-600/60 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-amber-100">
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="truncate">{embedRestrictedNotice}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {searchResults.length > 1 && (
                    <button
                      type="button"
                      onClick={() => tryNextPlayableResult(youtubeVideoId)}
                      className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-[10px] flex items-center gap-1"
                    >
                      <SkipForward className="w-3 h-3" />
                      <span>Next Video</span>
                    </button>
                  )}
                  <a
                    href={`https://www.youtube.com/watch?v=${youtubeVideoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-600 text-stone-100 font-semibold text-[10px] flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>YouTube</span>
                  </a>
                </div>
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
                    placeholder="Search anything on YouTube or paste URL..."
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
                    isPowerOn &&
                    isYouTubeActive &&
                    youtubeVideoId === preset.videoId;
                  return (
                    <button
                      key={preset.videoId}
                      type="button"
                      onClick={() => {
                        setViewMode('inline');
                        playYouTubeSelection(preset, 0);
                        setSearchStatus(`Playing ${preset.label} on TV`);
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
                <div className="space-y-1.5 max-h-56 overflow-y-auto survival-scroll pr-0.5">
                  {searchResults.map((item) => {
                    const selected =
                      isPowerOn &&
                      isYouTubeActive &&
                      youtubeVideoId === item.videoId;
                    return (
                      <button
                        key={item.videoId}
                        type="button"
                        onClick={() => {
                          setViewMode('inline');
                          playYouTubeSelection(item, 0);
                          setSearchStatus(`Playing: ${item.title}`);
                        }}
                        className={`w-full p-1.5 rounded-xl border text-left flex items-center gap-2.5 transition-colors ${
                          selected
                            ? 'bg-red-950/60 border-red-500 text-stone-50'
                            : 'bg-stone-950/80 hover:bg-stone-900 border-stone-800 text-stone-200'
                        }`}
                      >
                        <div className="relative w-20 h-11 rounded-lg overflow-hidden bg-stone-900 shrink-0">
                          <Image
                            src={normalizeThumbnailUrl(
                              item.thumbnail,
                              item.videoId,
                            )}
                            alt={item.title}
                            fill
                            sizes="80px"
                            referrerPolicy="no-referrer"
                            className="object-cover"
                          />
                          {item.duration && (
                            <span
                              className={`absolute bottom-0.5 right-0.5 px-1 py-0.2 rounded text-[9px] font-mono-tabular font-bold ${
                                item.duration === 'LIVE'
                                  ? 'bg-red-600 text-white'
                                  : 'bg-black/80 text-stone-100'
                              }`}
                            >
                              {item.duration}
                            </span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11px] font-semibold line-clamp-2 leading-tight">
                            {item.title}
                          </div>
                          <div className="text-[10px] text-stone-400 truncate mt-0.5">
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
                        <span className="text-xs font-bold truncate">
                          {ch.name}
                        </span>
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
        <div className="p-3 border-t border-stone-800 bg-stone-900/95 space-y-2.5 shrink-0">
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
            aria-label="Exit Remote"
            title="Exit remote and keep video playing on screen"
            className="w-full min-h-[44px] px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Exit Remote (Keep Video Playing)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
