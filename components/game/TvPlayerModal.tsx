'use client';

import React, { useState } from 'react';
import { MonitorPlay, Play, Search, Tv, Volume2, X } from 'lucide-react';

interface TvPlayerModalProps {
  onClose: () => void;
}

interface TvChannel {
  id: string;
  title: string;
  category: string;
  embedSrc: string;
}

const PRESET_CHANNELS: TvChannel[] = [
  {
    id: 'wildlife',
    title: 'Wild Nature & Rainforest Documentary',
    category: 'Nature',
    embedSrc: 'https://www.youtube.com/embed/BHACKCNDMW8?autoplay=1&rel=0',
  },
  {
    id: 'baking',
    title: 'Artisan Bread & Pastry Baking Guide',
    category: 'Kitchen',
    embedSrc: 'https://www.youtube.com/embed/5qap5aO4i9A?autoplay=1&rel=0',
  },
  {
    id: 'cabin',
    title: 'Cozy Mountain Cabin Fireplace & Rain',
    category: 'Ambience',
    embedSrc: 'https://www.youtube.com/embed/L_LUpnjgPso?autoplay=1&rel=0',
  },
  {
    id: 'bushcraft',
    title: 'Off-Grid Homestead & Cooking',
    category: 'Survival',
    embedSrc: 'https://www.youtube.com/embed/jfKfPfyJRdk?autoplay=1&rel=0',
  },
];

function parseYouTubeInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Check plain 11-char video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return `https://www.youtube.com/embed/${trimmed}?autoplay=1&rel=0`;
  }

  try {
    const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, '');
    if (host === 'youtu.be') {
      const vid = url.pathname.slice(1).split('/')[0];
      if (vid) return `https://www.youtube.com/embed/${vid}?autoplay=1&rel=0`;
    }
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = url.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1&rel=0`;
      const parts = url.pathname.split('/').filter(Boolean);
      if ((parts[0] === 'embed' || parts[0] === 'shorts' || parts[0] === 'live') && parts[1]) {
        return `https://www.youtube.com/embed/${parts[1]}?autoplay=1&rel=0`;
      }
    }
  } catch {
    // Fall through to search query embed
  }

  // Fallback: YouTube search playlist embed for typed video keywords!
  return `https://www.youtube.com/embed?listType=search&list=${encodeURIComponent(trimmed)}&autoplay=1`;
}

export function TvPlayerModal({ onClose }: TvPlayerModalProps) {
  const [activeSrc, setActiveSrc] = useState<string>(PRESET_CHANNELS[0].embedSrc);
  const [activeTitle, setActiveTitle] = useState<string>(PRESET_CHANNELS[0].title);
  const [inputValue, setInputValue] = useState<string>('');

  const handleLoadCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseYouTubeInput(inputValue);
    if (!parsed) return;
    setActiveSrc(parsed);
    setActiveTitle(
      inputValue.includes('http') ? 'Custom YouTube Video' : `YouTube: ${inputValue.trim()}`,
    );
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 p-3 sm:p-5">
      <div className="w-full max-w-4xl rounded-2xl bg-stone-900 border border-stone-700/80 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* TV Top Bezel Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-stone-800 bg-stone-950/70">
          <div className="flex items-center gap-2.5">
            <Tv className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="font-display text-base sm:text-lg font-bold text-stone-100">
                Hilltop Smart TV — YouTube Player
              </h2>
              <p className="text-xs text-stone-400 truncate max-w-md">
                Now Playing: {activeTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200"
            aria-label="Turn Off TV"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="p-4 sm:p-5 overflow-y-auto survival-scroll space-y-4">
          <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border-4 border-stone-800 shadow-2xl">
            <iframe
              key={activeSrc}
              src={activeSrc}
              title={activeTitle}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>

          {/* Search or Paste Any YouTube Link / Video ID */}
          <form onSubmit={handleLoadCustom} className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Paste any YouTube URL, Video ID, or search keywords (e.g. bread recipe)..."
                className="w-full min-h-[44px] pl-10 pr-4 rounded-xl bg-stone-950 border border-stone-700 focus:border-sky-500 outline-none text-xs sm:text-sm text-stone-100 placeholder:text-stone-500"
              />
            </div>
            <button
              type="submit"
              className="min-h-[44px] px-5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shrink-0"
            >
              <Play className="w-4 h-4" />
              <span>Watch on TV</span>
            </button>
          </form>

          {/* Preset Quick-Tune Channels */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-stone-400 flex items-center gap-1.5">
              <MonitorPlay className="w-3.5 h-3.5 text-sky-400" />
              <span>Quick Channels</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRESET_CHANNELS.map((ch) => {
                const selected = activeSrc === ch.embedSrc;
                return (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => {
                      setActiveSrc(ch.embedSrc);
                      setActiveTitle(ch.title);
                    }}
                    className={`p-3 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'bg-sky-950/60 border-sky-500 text-sky-100'
                        : 'bg-stone-950/75 border-stone-800 hover:border-stone-600 text-stone-200'
                    }`}
                  >
                    <div className="text-[10px] uppercase tracking-wider font-semibold text-sky-400 flex items-center justify-between">
                      <span>{ch.category}</span>
                      {selected && <Volume2 className="w-3 h-3" />}
                    </div>
                    <div className="text-xs font-semibold mt-1 line-clamp-2">
                      {ch.title}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
