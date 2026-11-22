'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, CircleAlert, Plane, Trash2, X } from 'lucide-react';
import type { GameEngine } from '@/game/engine/GameEngine';

interface ParkCreatorModalProps {
  engine: GameEngine;
  onClose: () => void;
  onOpenRideConsole?: () => void;
}

interface DeliveredParkSummary {
  id: string;
  name: string;
  site: { x: number; y: number; z: number; yaw: number };
  elements: number;
}

interface DeliveryResult {
  ok: boolean;
  parkId?: string;
  name?: string;
  site?: { x: number; y: number; z: number; yaw: number };
  coasterId?: string | null;
  error?: string;
}

export function ParkCreatorModal({ engine, onClose, onOpenRideConsole }: ParkCreatorModalProps) {
  const frameRef = useRef<HTMLIFrameElement | null>(null);
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [parks, setParks] = useState<DeliveredParkSummary[]>(() => engine.getDeliveredParks());

  const refreshParks = useCallback(() => {
    setParks(engine.getDeliveredParks());
  }, [engine]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as { type?: string; payload?: unknown } | null;
      if (!data || data.type !== 'si-amusement-park-delivery') return;
      let result: DeliveryResult;
      try {
        result = engine.deliverAmusementPark(
          data.payload as Parameters<GameEngine['deliverAmusementPark']>[0],
        );
      } catch (error) {
        result = {
          ok: false,
          error: error instanceof Error ? error.message : 'The world could not build that park.',
        };
      }
      if (result.ok) {
        setStatus({
          ok: true,
          message: `${result.name ?? 'Park'} delivered to ${(result.site?.x ?? 0).toFixed(0)}, ${(result.site?.z ?? 0).toFixed(0)}. The helicopter is lowering it into place.`,
        });
      } else {
        setStatus({ ok: false, message: result.error || 'Delivery failed.' });
      }
      refreshParks();
      event.source?.postMessage(
        {
          type: 'si-amusement-park-delivered',
          ok: result.ok,
          site: result.site
            ? `${result.site.x.toFixed(0)}, ${result.site.z.toFixed(0)}`
            : undefined,
          error: result.error,
        },
        { targetOrigin: event.origin === window.location.origin ? event.origin : '*' },
      );
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [engine, refreshParks]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const riskNote = useMemo(
    () =>
      'Build a coaster in the viewport, then open the Park tab to place paths, rides, shops, water features and visitors. Deliver sends the whole design to the island for a permanent helicopter drop.',
    [],
  );

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[#0b1014] text-stone-100">
      <header className="flex min-h-14 shrink-0 flex-wrap items-center gap-2 border-b border-stone-800 bg-stone-950/95 px-3 py-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Plane className="h-5 w-5 shrink-0 text-amber-300" />
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black uppercase tracking-wider text-amber-200">
              Amusement Park Creator
            </h2>
            <p className="truncate text-[10px] text-stone-400">{riskNote}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-200 sm:inline">
            {parks.length} delivered park{parks.length === 1 ? '' : 's'}
          </span>
          {onOpenRideConsole && (
            <button
              type="button"
              onClick={onOpenRideConsole}
              className="min-h-[40px] rounded-xl border border-stone-700 bg-stone-900 px-3 text-[10px] font-bold text-stone-300 hover:bg-stone-800"
            >
              Ride console
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700"
            aria-label="Close amusement park creator"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </header>

      {status && (
        <div
          className={`flex items-start gap-2 border-b px-3 py-2 text-[11px] ${
            status.ok
              ? 'border-emerald-500/30 bg-emerald-950/50 text-emerald-100'
              : 'border-rose-500/30 bg-rose-950/50 text-rose-100'
          }`}
        >
          {status.ok ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{status.message}</span>
          <button
            type="button"
            onClick={() => setStatus(null)}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider opacity-70 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {parks.length > 0 && (
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-stone-800 bg-stone-900/60 px-3 py-1.5">
          {parks.map((park) => (
            <span
              key={park.id}
              className="flex shrink-0 items-center gap-2 rounded-lg border border-stone-700 bg-stone-950/70 px-2 py-1 text-[10px]"
            >
              <span className="font-bold text-stone-200">{park.name}</span>
              <span className="font-mono text-stone-500">
                {park.elements} el · {park.site.x.toFixed(0)}, {park.site.z.toFixed(0)}
              </span>
              <button
                type="button"
                onClick={() => {
                  engine.removeAmusementPark(park.id);
                  refreshParks();
                  setStatus({ ok: true, message: `${park.name} removed from the island.` });
                }}
                className="rounded p-1 text-stone-500 hover:bg-rose-900/60 hover:text-rose-200"
                aria-label={`Remove ${park.name}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <iframe
        ref={frameRef}
        src="/coaster-studio?embed=1"
        title="3D amusement park and coaster construction studio"
        className="min-h-0 w-full flex-1 border-0 bg-[#0d1218]"
        allow="fullscreen; clipboard-write"
      />
    </div>
  );
}
