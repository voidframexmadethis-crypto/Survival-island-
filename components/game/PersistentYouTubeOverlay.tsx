'use client';

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Pause, Play, SlidersHorizontal, Tv, X } from 'lucide-react';
import type { TvScreenProjection } from '@/game/engine/GameEngine';
import type { TvBassMode, TvSafetyMode } from '@/game/types';

export interface PersistentYouTubeOverlayHandle {
  updateProjection: (proj: TvScreenProjection | null) => void;
  updateBassBump: (bassEnergy: number, bassMode: TvBassMode) => void;
}

interface PersistentYouTubeOverlayProps {
  active: boolean;
  videoId: string;
  title: string;
  isPaused: boolean;
  isMuted: boolean;
  volume: number;
  spatialVolume?: number;
  startSec?: number;
  remoteOpen: boolean;
  remoteViewMode: 'inline' | 'world3d';
  tvSafetyMode?: TvSafetyMode;
  inlineSlotElement: HTMLElement | null;
  pipDismissed: boolean;
  onDismissPip: () => void;
  onOpenRemote: () => void;
  onTogglePlayPause: () => void;
  onSyncTime?: (sec: number) => void;
  onYouTubeError?: (videoId: string, code: number) => void;
}

type PresentationMode = 'inline' | 'world3d' | 'pip' | 'hidden';

const WORLD_REF_WIDTH = 640;
const WORLD_REF_HEIGHT = 360;

export const PersistentYouTubeOverlay = forwardRef<
  PersistentYouTubeOverlayHandle,
  PersistentYouTubeOverlayProps
>(function PersistentYouTubeOverlay(
  {
    active,
    videoId,
    title,
    isPaused,
    isMuted,
    volume,
    spatialVolume,
    startSec = 0,
    remoteOpen,
    remoteViewMode,
    tvSafetyMode = 'auto',
    inlineSlotElement,
    pipDismissed,
    onDismissPip,
    onOpenRemote,
    onTogglePlayPause,
    onSyncTime,
    onYouTubeError,
  },
  ref,
) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const bumpFrameRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const projectionRef = useRef<TvScreenProjection | null>(null);
  const readyRef = useRef(false);
  const lastSentVolRef = useRef<number>(-1);
  const lastSentMutedRef = useRef<boolean | null>(null);
  const lastSentPausedRef = useRef<boolean | null>(null);
  const lastVolPushAtRef = useRef<number>(0);
  const lastLayoutKeyRef = useRef<string>('');
  const lastBassStateRef = useRef<string>('');

  const [projVisible, setProjVisible] = useState(false);
  const [nocookieVideoId, setNocookieVideoId] = useState<string | null>(null);

  const useNocookie = Boolean(videoId && nocookieVideoId === videoId);
  const streamInstanceKey = `${videoId}_${useNocookie ? 'nc' : 'yt'}`;

  useEffect(() => {
    readyRef.current = false;
    lastSentVolRef.current = -1;
    lastSentMutedRef.current = null;
    lastSentPausedRef.current = null;
    lastLayoutKeyRef.current = '';
  }, [streamInstanceKey, active]);

  const isInlineTarget = active && remoteOpen && remoteViewMode === 'inline';

  const mode: PresentationMode = useMemo(() => {
    if (!active || !videoId) return 'hidden';
    if (isInlineTarget) return 'inline';
    if (projVisible && tvSafetyMode !== 'safe_mini') return 'world3d';
    if (!remoteOpen && !pipDismissed) return 'pip';
    return 'hidden';
  }, [
    active,
    videoId,
    isInlineTarget,
    projVisible,
    tvSafetyMode,
    remoteOpen,
    pipDismissed,
  ]);

  const sendCommand = useCallback((func: string, args: unknown[] = []) => {
    const win = iframeRef.current?.contentWindow;
    if (!win) return;
    try {
      win.postMessage(
        JSON.stringify({
          event: 'command',
          func,
          args,
        }),
        '*',
      );
    } catch {
      // Ignore cross-origin timing before iframe finishes loading
    }
  }, []);

  const syncAudioState = useCallback(
    (force = false) => {
      if (!active || !readyRef.current) return;
      if (lastSentMutedRef.current !== isMuted || force) {
        sendCommand(isMuted ? 'mute' : 'unMute');
        lastSentMutedRef.current = isMuted;
      }
      if (!isMuted) {
        const targetVol =
          mode === 'world3d'
            ? (projectionRef.current?.spatialVolume ??
              spatialVolume ??
              Math.round(volume * 100))
            : mode === 'hidden'
              ? (spatialVolume ?? Math.round(volume * 100))
              : Math.round(volume * 100);
        const clamped = Math.max(0, Math.min(100, Math.round(targetVol)));
        const now = performance.now();
        if (
          force ||
          lastSentVolRef.current === -1 ||
          (Math.abs(clamped - lastSentVolRef.current) >= 2 &&
            now - lastVolPushAtRef.current >= 90)
        ) {
          sendCommand('setVolume', [clamped]);
          lastSentVolRef.current = clamped;
          lastVolPushAtRef.current = now;
        }
      }
    },
    [active, isMuted, mode, spatialVolume, volume, sendCommand],
  );

  // Apply DOM geometry for the current mode directly without triggering React re-renders or redundant style mutations per frame
  const applyContainerLayout = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const commitStyle = (
      layoutKey: string,
      apply: () => void,
    ) => {
      if (lastLayoutKeyRef.current === layoutKey) return;
      lastLayoutKeyRef.current = layoutKey;
      apply();
    };

    if (!active || !videoId) {
      commitStyle('inactive', () => {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        el.style.clipPath = 'none';
      });
      return;
    }

    if (mode === 'inline') {
      if (!inlineSlotElement) {
        commitStyle('inline_noslot', () => {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        });
        return;
      }
      const rect = inlineSlotElement.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) {
        commitStyle('inline_tiny', () => {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
        });
        return;
      }

      let clipPathVal = 'none';
      const scrollParent = inlineSlotElement.closest('.survival-scroll');
      if (scrollParent) {
        const sRect = scrollParent.getBoundingClientRect();
        const topClip = Math.max(0, sRect.top - rect.top);
        const bottomClip = Math.max(0, rect.bottom - sRect.bottom);
        const leftClip = Math.max(0, sRect.left - rect.left);
        const rightClip = Math.max(0, rect.right - sRect.right);
        if (topClip > 0 || bottomClip > 0 || leftClip > 0 || rightClip > 0) {
          clipPathVal = `inset(${topClip.toFixed(1)}px ${rightClip.toFixed(1)}px ${bottomClip.toFixed(1)}px ${leftClip.toFixed(1)}px round 12px)`;
        }
      }

      const wStr = `${rect.width.toFixed(2)}px`;
      const hStr = `${rect.height.toFixed(2)}px`;
      const xform = `translate3d(${rect.left.toFixed(2)}px, ${rect.top.toFixed(2)}px, 0)`;
      commitStyle(`inline:${wStr}:${hStr}:${xform}:${clipPathVal}`, () => {
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.right = 'auto';
        el.style.width = wStr;
        el.style.height = hStr;
        el.style.transformOrigin = '0 0';
        el.style.transform = xform;
        el.style.zIndex = '60';
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
        el.style.clipPath = clipPathVal;
      });
      return;
    }

    if (mode === 'world3d' && projectionRef.current?.visible) {
      const proj = projectionRef.current;
      const mat = proj.cssMatrix3d;
      if (
        !mat ||
        mat.includes('NaN') ||
        mat.includes('Infinity')
      ) {
        commitStyle('world3d_invalid', () => {
          el.style.opacity = '0';
          el.style.pointerEvents = 'none';
          el.style.transform = 'translate3d(-9999px, -9999px, 0)';
        });
        return;
      }
      commitStyle(`world3d:${mat}`, () => {
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.right = 'auto';
        el.style.width = `${WORLD_REF_WIDTH}px`;
        el.style.height = `${WORLD_REF_HEIGHT}px`;
        el.style.transformOrigin = '0 0';
        el.style.transform = mat;
        el.style.zIndex = '2';
        el.style.pointerEvents = 'none';
        el.style.opacity = '1';
        el.style.clipPath = 'none';
      });
      return;
    }

    if (mode === 'pip') {
      const vw = window.innerWidth || 1280;
      const vh = window.innerHeight || 720;
      const isCompactLandscape = vh < 520;
      const pipWidth = isCompactLandscape
        ? Math.min(220, Math.max(180, Math.round(vw * 0.24)))
        : Math.min(336, Math.max(200, Math.round(vw * 0.25)));
      const headerHeight = 32;
      const pipHeight = Math.round((pipWidth * 9) / 16) + headerHeight;
      const left = Math.max(12, vw - pipWidth - 16);
      const top = isCompactLandscape ? 98 : vw < 640 ? 108 : 114;
      commitStyle(`pip:${pipWidth}x${pipHeight}:${left},${top}`, () => {
        el.style.left = '0px';
        el.style.top = '0px';
        el.style.right = 'auto';
        el.style.width = `${pipWidth}px`;
        el.style.height = `${pipHeight}px`;
        el.style.transformOrigin = '0 0';
        el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
        el.style.zIndex = '25';
        el.style.pointerEvents = 'auto';
        el.style.opacity = '1';
        el.style.clipPath = 'none';
      });
      return;
    }

    commitStyle('hidden', () => {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      el.style.transform = 'translate3d(-9999px, -9999px, 0)';
      el.style.clipPath = 'none';
    });
  }, [active, videoId, mode, inlineSlotElement]);

  const applyBassVisualBump = useCallback(
    (rawEnergy: number, bassMode: TvBassMode) => {
      const frameEl = bumpFrameRef.current;
      const outerEl = containerRef.current;
      if (!frameEl || !outerEl) return;

      const energy =
        !active || isPaused || isMuted || bassMode === 'off'
          ? 0
          : Math.max(0, Math.min(1, rawEnergy));

      if (energy <= 0.005) {
        if (lastBassStateRef.current !== 'idle') {
          lastBassStateRef.current = 'idle';
          frameEl.style.transform = 'translate3d(0px, 0px, 0) scale(1)';
          outerEl.style.boxShadow = '';
        }
        return;
      }

      const amp = bassMode === 'extreme' ? 1.35 : 1.0;
      const t = performance.now() * 0.058;
      const scale = 1 + energy * (mode === 'world3d' ? 0.024 : 0.018) * amp;
      const dx = Math.cos(t * 0.92) * energy * 1.7 * amp;
      const dy = Math.sin(t * 1.15) * energy * (mode === 'world3d' ? 3.4 : 2.6) * amp;
      const rot = Math.sin(t * 1.4) * energy * 0.48 * amp;

      const xform = `translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${scale.toFixed(4)}) rotate(${rot.toFixed(3)}deg)`;
      const glowAlpha = Math.min(0.85, 0.2 + energy * 0.65);
      const glowBlur = Math.round(14 + energy * 28 * amp);
      const shadowVal =
        mode === 'world3d'
          ? ''
          : `0 0 ${glowBlur}px rgba(249, 115, 22, ${glowAlpha.toFixed(2)})`;

      const stateKey = `${xform}|${shadowVal}`;
      if (lastBassStateRef.current === stateKey) return;
      lastBassStateRef.current = stateKey;
      frameEl.style.transform = xform;
      if (mode !== 'world3d') {
        outerEl.style.boxShadow = shadowVal;
      }
    },
    [active, isPaused, isMuted, mode],
  );

  useImperativeHandle(
    ref,
    () => ({
      updateProjection(proj: TvScreenProjection | null) {
        if (
          proj?.visible &&
          (!proj.cssMatrix3d ||
            proj.cssMatrix3d.includes('NaN') ||
            proj.cssMatrix3d.includes('Infinity'))
        ) {
          projectionRef.current = null;
          setProjVisible((prev) => (prev ? false : prev));
          return;
        }
        projectionRef.current = proj;
        const nextVisible = Boolean(proj?.visible) && tvSafetyMode !== 'safe_mini';
        setProjVisible((prev) => (prev === nextVisible ? prev : nextVisible));
        if (mode === 'world3d') {
          applyContainerLayout();
          syncAudioState(false);
          if (proj) {
            applyBassVisualBump(proj.bassEnergy ?? 0, proj.bassMode ?? 'trunk');
          }
        }
      },
      updateBassBump(bassEnergy: number, bassMode: TvBassMode) {
        applyBassVisualBump(bassEnergy, bassMode);
      },
    }),
    [mode, tvSafetyMode, applyContainerLayout, syncAudioState, applyBassVisualBump],
  );

  // Sync layout immediately whenever mode changes, and track inline slot via ResizeObserver + passive scroll
  useEffect(() => {
    applyContainerLayout();
    if (!active) return;

    const onSync = () => applyContainerLayout();
    window.addEventListener('resize', onSync);

    let ro: ResizeObserver | null = null;
    let scrollParent: Element | null = null;
    let fallbackTimer: number | null = null;

    if (mode === 'inline' && inlineSlotElement) {
      if (typeof ResizeObserver !== 'undefined') {
        ro = new ResizeObserver(onSync);
        ro.observe(inlineSlotElement);
      }
      scrollParent = inlineSlotElement.closest('.survival-scroll');
      if (scrollParent) {
        if (ro) ro.observe(scrollParent);
        scrollParent.addEventListener('scroll', onSync, { passive: true });
      }
      window.addEventListener('scroll', onSync, { passive: true });
      fallbackTimer = window.setInterval(onSync, 250);
    }

    return () => {
      window.removeEventListener('resize', onSync);
      window.removeEventListener('scroll', onSync);
      if (scrollParent) {
        scrollParent.removeEventListener('scroll', onSync);
      }
      if (ro) {
        ro.disconnect();
      }
      if (fallbackTimer !== null) {
        window.clearInterval(fallbackTimer);
      }
    };
  }, [active, mode, inlineSlotElement, applyContainerLayout]);

  // Sync Play/Pause, Mute, and Volume changes via postMessage
  useEffect(() => {
    if (!active || !readyRef.current) return;
    if (lastSentPausedRef.current !== isPaused) {
      sendCommand(isPaused ? 'pauseVideo' : 'playVideo');
      lastSentPausedRef.current = isPaused;
    }
    syncAudioState(true);
  }, [active, isPaused, isMuted, volume, spatialVolume, mode, sendCommand, syncAudioState]);

  // Listen to YouTube IFrame API messages (progress & embed errors)
  useEffect(() => {
    if (!active || !videoId) return;
    const onMessage = (event: MessageEvent) => {
      if (
        typeof event.origin !== 'string' ||
        (!event.origin.includes('youtube.com') &&
          !event.origin.includes('youtube-nocookie.com'))
      ) {
        return;
      }
      if (
        iframeRef.current?.contentWindow &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return;
      }
      let payload: unknown = event.data;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }
      if (!payload || typeof payload !== 'object') return;
      const msg = payload as {
        event?: string;
        info?: number | { currentTime?: number };
      };
      if (
        msg.event === 'infoDelivery' &&
        msg.info &&
        typeof msg.info === 'object' &&
        typeof msg.info.currentTime === 'number' &&
        Number.isFinite(msg.info.currentTime)
      ) {
        onSyncTime?.(msg.info.currentTime);
      } else if (msg.event === 'onError' && typeof msg.info === 'number') {
        if (msg.info === 153 && !useNocookie) {
          setNocookieVideoId(videoId);
          return;
        }
        onYouTubeError?.(videoId, msg.info);
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [active, videoId, useNocookie, onSyncTime, onYouTubeError]);

  const embedUrl = useMemo(() => {
    if (!active || !videoId) return 'about:blank';
    const host = useNocookie
      ? 'https://www.youtube-nocookie.com'
      : 'https://www.youtube.com';
    const params = new URLSearchParams({
      autoplay: '1',
      rel: '0',
      playsinline: '1',
      enablejsapi: '1',
      modestbranding: '1',
    });
    const safeStart = Math.max(0, Math.floor(startSec));
    if (safeStart > 0) {
      params.set('start', String(safeStart));
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      params.set('origin', window.location.origin);
    }
    return `${host}/embed/${videoId}?${params.toString()}`;
  }, [active, videoId, useNocookie, startSec]);

  if (!active || !videoId) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      data-testid="persistent-youtube-overlay"
      data-tv-mode={mode}
      onPointerDown={(e) => {
        if (mode === 'inline' || mode === 'pip') {
          e.stopPropagation();
        }
      }}
      className={`fixed left-0 top-0 flex flex-col overflow-hidden bg-black ${
        mode === 'pip'
          ? 'rounded-xl border border-stone-600/90 shadow-2xl ring-1 ring-black/60'
          : mode === 'inline'
            ? 'rounded-xl'
            : ''
      }`}
      style={{
        opacity: 0,
        pointerEvents: 'none',
        transform: 'translate3d(-9999px, -9999px, 0)',
        transformOrigin: '0 0',
      }}
    >
      <div
        ref={bumpFrameRef}
        className="flex flex-col w-full h-full will-change-transform"
        style={{ transformOrigin: 'center center' }}
      >
        {/* Minimal Mini-TV Bezel (only visible in floating PiP screen mode when remote is closed & 3D TV is off-camera) */}
        {mode === 'pip' && (
          <div className="h-8 px-2 bg-stone-950/95 border-b border-stone-800 flex items-center justify-between gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <Tv className="w-3.5 h-3.5 text-red-400 shrink-0" />
              <span className="text-[11px] font-semibold text-stone-100 truncate">
                {title || 'TV Playing'}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={onTogglePlayPause}
                className="w-6 h-6 rounded-md bg-stone-800 hover:bg-stone-700 text-stone-100 flex items-center justify-center transition-colors"
                aria-label={isPaused ? 'Resume TV' : 'Pause TV'}
                title={isPaused ? 'Resume Video' : 'Pause Video'}
              >
                {isPaused ? (
                  <Play className="w-3 h-3 fill-current" />
                ) : (
                  <Pause className="w-3 h-3 fill-current" />
                )}
              </button>
              <button
                type="button"
                onClick={onOpenRemote}
                className="h-6 px-1.5 rounded-md bg-stone-800 hover:bg-stone-700 text-amber-300 text-[10px] font-semibold flex items-center gap-1 transition-colors"
                aria-label="Open TV Remote"
                title="Open TV Remote"
              >
                <SlidersHorizontal className="w-3 h-3" />
                <span>Remote</span>
              </button>
              <button
                type="button"
                onClick={onDismissPip}
                className="w-6 h-6 rounded-md bg-stone-800 hover:bg-red-900/80 text-stone-300 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Hide Floating TV Screen"
                title="Hide Mini-TV Screen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Single Persistent YouTube IFrame — Never Unmounts When Exiting Remote */}
        <div className="relative flex-1 w-full h-full bg-black overflow-hidden">
          <iframe
            key={streamInstanceKey}
            ref={iframeRef}
            src={embedUrl}
            title={title || 'Smart TV YouTube Player'}
            className="w-full h-full border-0 block"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
            onLoad={() => {
              readyRef.current = true;
              try {
                iframeRef.current?.contentWindow?.postMessage(
                  JSON.stringify({
                    event: 'listening',
                    id: 1,
                    channel: 'widget',
                  }),
                  '*',
                );
              } catch {
                // Ignore cross-origin timing
              }
              lastSentPausedRef.current = isPaused;
              sendCommand(isPaused ? 'pauseVideo' : 'playVideo');
              syncAudioState(true);
              applyContainerLayout();
            }}
          />
        </div>
      </div>
    </div>
  );
});
