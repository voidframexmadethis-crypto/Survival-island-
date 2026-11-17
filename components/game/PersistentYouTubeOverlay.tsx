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

export interface PersistentYouTubeOverlayHandle {
  updateProjection: (proj: TvScreenProjection | null) => void;
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
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const projectionRef = useRef<TvScreenProjection | null>(null);
  const readyRef = useRef(false);
  const lastSentVolRef = useRef<number>(-1);
  const lastSentMutedRef = useRef<boolean | null>(null);
  const lastSentPausedRef = useRef<boolean | null>(null);
  const lastVolPushAtRef = useRef<number>(0);

  const [projVisible, setProjVisible] = useState(false);
  const [nocookieVideoId, setNocookieVideoId] = useState<string | null>(null);

  const useNocookie = Boolean(videoId && nocookieVideoId === videoId);
  const streamInstanceKey = `${videoId}_${useNocookie ? 'nc' : 'yt'}`;

  useEffect(() => {
    readyRef.current = false;
    lastSentVolRef.current = -1;
    lastSentMutedRef.current = null;
    lastSentPausedRef.current = null;
  }, [streamInstanceKey, active]);

  const isInlineTarget = active && remoteOpen && remoteViewMode === 'inline';

  const mode: PresentationMode = useMemo(() => {
    if (!active || !videoId) return 'hidden';
    if (isInlineTarget) return 'inline';
    if (projVisible) return 'world3d';
    if (!remoteOpen && !pipDismissed) return 'pip';
    return 'hidden';
  }, [active, videoId, isInlineTarget, projVisible, remoteOpen, pipDismissed]);

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

  // Apply DOM geometry for the current mode directly without triggering React re-renders per frame
  const applyContainerLayout = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (!active || !videoId) {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      el.style.transform = 'translate3d(-9999px, -9999px, 0)';
      el.style.clipPath = 'none';
      return;
    }

    if (mode === 'inline') {
      if (!inlineSlotElement) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }
      const rect = inlineSlotElement.getBoundingClientRect();
      if (rect.width < 10 || rect.height < 10) {
        el.style.opacity = '0';
        el.style.pointerEvents = 'none';
        return;
      }
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.right = 'auto';
      el.style.width = `${rect.width.toFixed(2)}px`;
      el.style.height = `${rect.height.toFixed(2)}px`;
      el.style.transformOrigin = '0 0';
      el.style.transform = `translate3d(${rect.left.toFixed(2)}px, ${rect.top.toFixed(2)}px, 0)`;
      el.style.zIndex = '60';
      el.style.pointerEvents = 'auto';
      el.style.opacity = '1';

      const scrollParent = inlineSlotElement.closest('.survival-scroll');
      if (scrollParent) {
        const sRect = scrollParent.getBoundingClientRect();
        const topClip = Math.max(0, sRect.top - rect.top);
        const bottomClip = Math.max(0, rect.bottom - sRect.bottom);
        const leftClip = Math.max(0, sRect.left - rect.left);
        const rightClip = Math.max(0, rect.right - sRect.right);
        if (topClip > 0 || bottomClip > 0 || leftClip > 0 || rightClip > 0) {
          el.style.clipPath = `inset(${topClip.toFixed(1)}px ${rightClip.toFixed(1)}px ${bottomClip.toFixed(1)}px ${leftClip.toFixed(1)}px round 12px)`;
        } else {
          el.style.clipPath = 'none';
        }
      } else {
        el.style.clipPath = 'none';
      }
      return;
    }

    if (mode === 'world3d' && projectionRef.current?.visible) {
      const proj = projectionRef.current;
      el.style.left = '0px';
      el.style.top = '0px';
      el.style.right = 'auto';
      el.style.width = `${WORLD_REF_WIDTH}px`;
      el.style.height = `${WORLD_REF_HEIGHT}px`;
      el.style.transformOrigin = '0 0';
      el.style.transform = proj.cssMatrix3d;
      el.style.zIndex = '2';
      el.style.pointerEvents = 'none';
      el.style.opacity = '1';
      el.style.clipPath = 'none';
      return;
    }

    if (mode === 'pip') {
      const vw = window.innerWidth || 1280;
      const pipWidth = Math.min(336, Math.max(220, Math.round(vw * 0.25)));
      const headerHeight = 32;
      const pipHeight = Math.round((pipWidth * 9) / 16) + headerHeight;
      const left = Math.max(12, vw - pipWidth - 16);
      const top = 72;
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
      return;
    }

    el.style.opacity = '0';
    el.style.pointerEvents = 'none';
    el.style.transform = 'translate3d(-9999px, -9999px, 0)';
    el.style.clipPath = 'none';
  }, [active, videoId, mode, inlineSlotElement]);

  useImperativeHandle(
    ref,
    () => ({
      updateProjection(proj: TvScreenProjection | null) {
        projectionRef.current = proj;
        const nextVisible = Boolean(proj?.visible);
        setProjVisible((prev) => (prev === nextVisible ? prev : nextVisible));
        if (mode === 'world3d') {
          applyContainerLayout();
          syncAudioState(false);
        }
      },
    }),
    [mode, applyContainerLayout, syncAudioState],
  );

  // Sync layout immediately whenever mode changes, and continuously track inline slot / window resize
  useEffect(() => {
    applyContainerLayout();
    if (!active) return;

    let rafId = 0;
    const onResize = () => applyContainerLayout();
    window.addEventListener('resize', onResize);

    if (mode === 'inline' && inlineSlotElement) {
      const syncLoop = () => {
        applyContainerLayout();
        rafId = window.requestAnimationFrame(syncLoop);
      };
      rafId = window.requestAnimationFrame(syncLoop);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (rafId) window.cancelAnimationFrame(rafId);
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
  );
});
