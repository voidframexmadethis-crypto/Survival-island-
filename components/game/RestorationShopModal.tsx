'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Send, Terminal, Wrench, X } from 'lucide-react';
import type { GameEngine } from '@/game/engine/GameEngine';
import { HUDStateSnapshot } from '@/game/types';

interface RestorationShopModalProps {
  engine: GameEngine;
  hud: HUDStateSnapshot;
  onClose: () => void;
}

interface ChatMessage {
  id: number;
  from: 'computer' | 'player';
  text: string;
}

const QUICK_REQUESTS = [
  "'64 Impala",
  "'74 Caprice Box",
  "'87 Regal",
  "'79 Coupe de Ville",
  'El Camino',
  'Town Car',
  'Surprise me',
];

export function RestorationShopModal({
  engine,
  hud,
  onClose,
}: RestorationShopModalProps) {
  const snapshot = hud.restorationShop ?? engine.getRestorationShopHudState();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 0, from: 'computer', text: engine.getRestorationShopGreeting() },
  ]);
  const nextId = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    });
  }, [messages]);

  const status = useMemo(() => {
    if (snapshot.completed) return 'READY · CAR IN THE BAY';
    if (snapshot.phase === 'waiting_donor') {
      return `FREIGHT · SHELL ETA ${snapshot.cargoEtaLabel}`;
    }
    if (snapshot.phase === 'restoring') {
      return `${snapshot.stageLabel.toUpperCase()} · ${Math.round(
        snapshot.overallProgress * 100,
      )}%`;
    }
    if (snapshot.phase !== 'idle') {
      return `${snapshot.stageLabel.toUpperCase()} · ${Math.round(
        snapshot.overallProgress * 100,
      )}%`;
    }
    return 'BAY OPEN · NPC CREW READY';
  }, [snapshot]);

  const send = (value: string) => {
    const text = value.trim();
    if (!text) return;
    const playerMessage: ChatMessage = {
      id: nextId.current++,
      from: 'player',
      text,
    };
    const reply = engine.chatWithRestorationShop(text);
    const computerMessage: ChatMessage = {
      id: nextId.current++,
      from: 'computer',
      text: reply,
    };
    setMessages((previous) => [...previous, playerMessage, computerMessage]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/85 p-3 sm:p-6">
      <div className="relative flex h-[min(680px,92vh)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-emerald-900/60 bg-[#07110f] shadow-[0_30px_90px_rgba(0,0,0,0.75)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(134,239,172,0.18) 0px, rgba(134,239,172,0.18) 1px, transparent 1px, transparent 3px)',
          }}
        />
        <div className="relative flex items-start justify-between gap-3 border-b border-emerald-900/50 bg-[#0a1a15] px-4 py-3 sm:px-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/10 text-emerald-300">
              <Terminal className="h-5 w-5" />
            </div>
            <div>
              <div className="font-mono-tabular text-[10px] font-bold uppercase tracking-[0.32em] text-emerald-500/80">
                Bayou Royal Customs
              </div>
              <h2 className="font-display text-lg font-bold leading-tight text-emerald-50">
                Shop computer
              </h2>
              <p className="text-[11px] text-emerald-200/55">
                Duke and Rae do every part of the job. You just tell the computer
                what car you want.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-xl border border-emerald-900 bg-emerald-950/60 text-emerald-300 transition hover:bg-emerald-900/60"
            aria-label="Close shop computer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="relative flex items-center justify-between gap-2 border-b border-emerald-900/40 bg-[#08150f] px-4 py-1.5 font-mono-tabular text-[10px] uppercase tracking-wider text-emerald-400/70">
          <span className="flex min-w-0 items-center gap-1.5">
            <Wrench className="h-3 w-3 shrink-0" />
            <span className="truncate">{status}</span>
          </span>
          <span className="shrink-0 text-emerald-600">LIVE LINK</span>
        </div>

        <div
          ref={scrollRef}
          className="survival-scroll relative min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5"
        >
          {messages.map((message) =>
            message.from === 'computer' ? (
              <div key={message.id} className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 font-mono-tabular text-[9px] font-bold text-emerald-300">
                  BR
                </div>
                <div className="max-w-[88%] rounded-xl rounded-tl-sm border border-emerald-900/50 bg-emerald-950/35 px-3 py-2">
                  <div className="font-mono-tabular text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-500/70">
                    Shop computer
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-emerald-100/85">
                    {message.text}
                  </p>
                </div>
              </div>
            ) : (
              <div key={message.id} className="flex justify-end">
                <div className="max-w-[85%] rounded-xl rounded-tr-sm border border-amber-700/40 bg-amber-950/30 px-3 py-2">
                  <div className="font-mono-tabular text-[9px] font-bold uppercase tracking-[0.18em] text-amber-500/80">
                    You
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-amber-50/90">
                    {message.text}
                  </p>
                </div>
              </div>
            ),
          )}
        </div>

        <div className="relative border-t border-emerald-900/50 bg-[#08150f] p-3 sm:p-4">
          <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
            {QUICK_REQUESTS.map((request) => (
              <button
                key={request}
                type="button"
                onClick={() => send(request)}
                className="shrink-0 rounded-full border border-emerald-900 bg-emerald-950/50 px-2.5 py-1 text-[10px] font-medium text-emerald-300/80 transition hover:border-emerald-500/50 hover:text-emerald-200"
              >
                {request}
              </button>
            ))}
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2"
          >
            <span className="font-mono-tabular text-sm text-emerald-500">&gt;</span>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder='Tell the crew what to build… try "64 Impala"'
              className="min-h-[44px] min-w-0 flex-1 rounded-lg border border-emerald-900/80 bg-[#06100d] px-3 font-mono-tabular text-sm text-emerald-100 placeholder:text-emerald-800 focus:border-emerald-500/60 focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 transition hover:bg-emerald-500/25"
              aria-label="Send message to the shop computer"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
          <div className="mt-2 flex items-center gap-1 text-[10px] text-emerald-700">
            <CornerDownLeft className="h-3 w-3" />
            Enter sends · close the terminal to let the crew work
          </div>
        </div>
      </div>
    </div>
  );
}
