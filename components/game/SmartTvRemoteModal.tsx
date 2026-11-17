'use client';

import React, { useRef } from 'react';
import {
  Tv,
  Power,
  Volume2,
  VolumeX,
  Volume1,
  ChevronUp,
  ChevronDown,
  Film,
  Smile,
  Radio,
  FileVideo,
  Eye,
  X,
  Sparkles,
} from 'lucide-react';
import { TvChannelId, TV_CHANNELS } from '@/game/systems/smartTvSystem';

interface SmartTvRemoteModalProps {
  power: boolean;
  currentChannel: TvChannelId;
  volume: number;
  isMuted: boolean;
  isZoomedToTv: boolean;
  onTogglePower: () => void;
  onSetChannel: (ch: TvChannelId) => void;
  onNextChannel: () => void;
  onPrevChannel: () => void;
  onSetVolume: (vol: number) => void;
  onToggleMute: () => void;
  onToggleZoomToTv: () => void;
  onLoadLocalVideo: (file: File) => void;
  onClose: () => void;
}

export const SmartTvRemoteModal: React.FC<SmartTvRemoteModalProps> = ({
  power,
  currentChannel,
  volume,
  isMuted,
  isZoomedToTv,
  onTogglePower,
  onSetChannel,
  onNextChannel,
  onPrevChannel,
  onSetVolume,
  onToggleMute,
  onToggleZoomToTv,
  onLoadLocalVideo,
  onClose,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLoadLocalVideo(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-4 animate-fadeIn">
      {/* Hidden local video file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Samsung-Style Sleek Curved Remote Body */}
      <div className="relative w-full max-w-sm bg-stone-900 border-2 border-stone-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col p-5 space-y-4">
        {/* Remote Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold font-display text-stone-100 tracking-wide">
                SAMSUNG SMART REMOTE
              </h3>
              <p className="text-[11px] text-stone-400 font-mono">
                {power ? `ONLINE · CH ${currentChannel}` : 'STANDBY'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
            title="Close Remote & Keep TV Playing"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Top Control Bar: Power, Zoom & Mute */}
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={onTogglePower}
            className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-xs transition shadow-lg ${
              power
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/30'
                : 'bg-stone-800 hover:bg-stone-700 text-stone-400'
            }`}
          >
            <Power className="w-5 h-5" />
            <span>{power ? 'POWER OFF' : 'POWER ON'}</span>
          </button>

          <button
            onClick={onToggleZoomToTv}
            className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-xs transition border ${
              isZoomedToTv
                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
            }`}
            title="Focus first-person camera onto TV screen"
          >
            <Eye className="w-5 h-5" />
            <span>{isZoomedToTv ? 'GAME VIEW' : 'ZOOM TV'}</span>
          </button>

          <button
            onClick={onToggleMute}
            className={`py-3 rounded-2xl flex flex-col items-center justify-center gap-1 font-bold text-xs transition border ${
              isMuted
                ? 'bg-red-950/60 border-red-500 text-red-300'
                : 'bg-stone-950 border-stone-800 text-stone-300 hover:border-stone-700'
            }`}
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            <span>{isMuted ? 'MUTED' : 'MUTE'}</span>
          </button>
        </div>

        {/* App Launcher Shortcuts (Samsung Tizen App Dock) */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider flex items-center justify-between">
            <span>Instant Channels</span>
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            {TV_CHANNELS.map((ch) => {
              const active = power && currentChannel === ch.id;
              return (
                <button
                  key={ch.id}
                  onClick={() => {
                    if (!power) onTogglePower();
                    onSetChannel(ch.id);
                  }}
                  className={`p-2.5 rounded-xl text-left border transition flex flex-col justify-between ${
                    active
                      ? 'bg-stone-800/90 border-sky-400 shadow-md shadow-sky-500/10'
                      : 'bg-stone-950/80 border-stone-800 hover:border-stone-700 text-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded font-extrabold uppercase"
                      style={{ backgroundColor: ch.color, color: '#fff' }}
                    >
                      {ch.badge}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">CH {ch.id}</span>
                  </div>
                  <div className="mt-1">
                    <h4 className="text-xs font-bold text-stone-100">{ch.name}</h4>
                    <p className="text-[10px] text-stone-400 truncate">{ch.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Local Video File Loader in TubeCast */}
        <div className="rounded-xl bg-stone-950/70 border border-stone-800 p-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileVideo className="w-4 h-4 text-sky-400" />
            <div className="text-[11px]">
              <span className="font-bold text-stone-200">Load My Video File</span>
              <p className="text-[10px] text-stone-400">Play local MP4/WebM on 3D TV</p>
            </div>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition"
          >
            Select File
          </button>
        </div>

        {/* Volume & Channel Rockers */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* Volume Control */}
          <div className="rounded-2xl bg-stone-950/90 border border-stone-800 p-2 flex flex-col items-center justify-between h-28">
            <button
              onClick={() => onSetVolume(Math.min(1, volume + 0.1))}
              className="p-1 rounded-lg hover:bg-stone-800 text-stone-300"
              title="Volume Up"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="text-center font-mono">
              <span className="text-xs font-bold text-stone-200">
                {Math.round(volume * 100)}%
              </span>
              <p className="text-[9px] text-stone-500">VOL</p>
            </div>
            <button
              onClick={() => onSetVolume(Math.max(0, volume - 0.1))}
              className="p-1 rounded-lg hover:bg-stone-800 text-stone-300"
              title="Volume Down"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>

          {/* Channel Rocker */}
          <div className="rounded-2xl bg-stone-950/90 border border-stone-800 p-2 flex flex-col items-center justify-between h-28">
            <button
              onClick={onNextChannel}
              className="p-1 rounded-lg hover:bg-stone-800 text-stone-300"
              title="Next Channel"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <div className="text-center font-mono">
              <span className="text-xs font-bold text-amber-400">CH {currentChannel}</span>
              <p className="text-[9px] text-stone-500">PROG</p>
            </div>
            <button
              onClick={onPrevChannel}
              className="p-1 rounded-lg hover:bg-stone-800 text-stone-300"
              title="Previous Channel"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Back to Game Button */}
        <button
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-sm tracking-wide transition shadow-xl"
        >
          Back to Game (Keep TV Playing)
        </button>
      </div>
    </div>
  );
};
