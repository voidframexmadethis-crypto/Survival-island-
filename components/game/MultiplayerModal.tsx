'use client';

import React, { useState } from 'react';
import {
  Check,
  Copy,
  Link2,
  LogOut,
  MessageSquare,
  Radio,
  Send,
  ShieldAlert,
  Users,
  Volume2,
  VolumeX,
  Wifi,
  X,
} from 'lucide-react';
import { MultiplayerStatusSnapshot } from '@/game/types';
import { getWebUrl } from '@/game/systems/apiConfig';

interface MultiplayerModalProps {
  mpState?: MultiplayerStatusSnapshot;
  chatLog: { peerId: string; name: string; text: string; time: number }[];
  initialJoinCode?: string;
  onCreateRoom: (playerName: string) => Promise<string | null>;
  onJoinRoom: (roomCode: string, playerName: string) => Promise<boolean>;
  onLeaveRoom: () => void;
  onUpdateName: (name: string) => void;
  onTogglePvp: (enabled: boolean) => void;
  onSendChat: (text: string) => void;
  onInitMic: () => void;
  onToggleMicMute: () => void;
  onSetVoiceMode: (mode: 'party' | 'proximity') => void;
  onClose: () => void;
}

export const MultiplayerModal: React.FC<MultiplayerModalProps> = ({
  mpState,
  chatLog,
  initialJoinCode = '',
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onUpdateName,
  onTogglePvp,
  onSendChat,
  onInitMic,
  onToggleMicMute,
  onSetVoiceMode,
  onClose,
}) => {
  const [nameInput, setNameInput] = useState(mpState?.playerName || 'IslandSurvivor');
  const [joinCodeInput, setJoinCodeInput] = useState(initialJoinCode);
  const [chatInput, setChatInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorText, setErrorText] = useState('');

  const handleHost = async () => {
    setBusy(true);
    setErrorText('');
    try {
      onUpdateName(nameInput);
      await onCreateRoom(nameInput);
    } catch {
      setErrorText('Could not initialize local room.');
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    const clean = joinCodeInput.trim().toUpperCase();
    if (!clean) {
      setErrorText('Enter a 6-character room code first.');
      return;
    }
    setBusy(true);
    setErrorText('');
    try {
      onUpdateName(nameInput);
      const ok = await onJoinRoom(clean, nameInput);
      if (!ok) {
        setErrorText(`Room "${clean}" not found. Double-check code with host.`);
      }
    } finally {
      setBusy(false);
    }
  };

  const copyRoomCode = () => {
    if (!mpState?.roomCode) return;
    navigator.clipboard?.writeText(mpState.roomCode).catch(() => {});
    setCopiedCode(true);
    window.setTimeout(() => setCopiedCode(false), 1800);
  };

  const copyInviteLink = () => {
    if (!mpState?.roomCode || typeof window === 'undefined') return;
    const url = new URL(getWebUrl() || window.location.href);
    url.searchParams.set('room', mpState.roomCode);
    navigator.clipboard?.writeText(url.toString()).catch(() => {});
    setCopiedLink(true);
    window.setTimeout(() => setCopiedLink(false), 1800);
  };

  const sendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput);
    setChatInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-2xl bg-stone-900 border border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-stone-950 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-sky-500/20 border border-sky-500/40 text-sky-400">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display text-stone-100">
                P2P Island Multiplayer
              </h2>
              <p className="text-xs text-stone-400">
                Native WebRTC DataChannel &amp; local room codes · Zero external APIs
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300"
            aria-label="Close multiplayer menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 survival-scroll">
          {/* Status Strip */}
          <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Radio
                className={`w-4 h-4 ${
                  mpState?.connected ? 'text-emerald-400' : 'text-stone-500'
                }`}
              />
              <div className="text-xs">
                <div className="font-bold text-stone-100">
                  {mpState?.connected
                    ? mpState.isHost
                      ? `Hosting Room ${mpState.roomCode}`
                      : `Connected to Room ${mpState.roomCode}`
                    : 'Offline Solo World'}
                </div>
                <div className="text-stone-400">{mpState?.statusMessage}</div>
              </div>
            </div>

            {mpState?.connected && (
              <button
                type="button"
                onClick={onLeaveRoom}
                className="px-3 py-1.5 rounded-lg bg-red-950/80 hover:bg-red-800 border border-red-700/60 text-red-200 text-xs font-bold flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Leave Room</span>
              </button>
            )}
          </div>

          {/* Voice Chat Settings */}
          <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Radio className="w-4 h-4" />
                <span>Microphone Voice Chat (P2P WebRTC)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onInitMic}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                    mpState?.micEnabled
                      ? 'bg-emerald-950 border border-emerald-500/60 text-emerald-300'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-stone-950'
                  }`}
                >
                  {mpState?.micEnabled ? 'Mic Active' : 'Enable Mic'}
                </button>
                <button
                  type="button"
                  onClick={onToggleMicMute}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                    mpState?.micMuted
                      ? 'bg-red-950 border-red-600 text-red-200'
                      : 'bg-emerald-950 border-emerald-600 text-emerald-200'
                  }`}
                >
                  {mpState?.micMuted ? 'Muted' : 'Mic On'}
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs pt-2 border-t border-stone-800">
              <span className="text-stone-300">Voice Mode</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onSetVoiceMode('party')}
                  className={`px-3 py-1 rounded-lg font-semibold border ${
                    (mpState?.voiceMode ?? 'party') === 'party'
                      ? 'bg-sky-600 border-sky-400 text-stone-950'
                      : 'bg-stone-900 border-stone-700 text-stone-300'
                  }`}
                >
                  Party Chat (Anywhere)
                </button>
                <button
                  type="button"
                  onClick={() => onSetVoiceMode('proximity')}
                  className={`px-3 py-1 rounded-lg font-semibold border ${
                    mpState?.voiceMode === 'proximity'
                      ? 'bg-sky-600 border-sky-400 text-stone-950'
                      : 'bg-stone-900 border-stone-700 text-stone-300'
                  }`}
                >
                  Proximity Chat (3D Spatial)
                </button>
              </div>
            </div>
          </div>

          {/* Callsign */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Survivor Callsign
              </label>
              <input
                type="text"
                maxLength={24}
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onBlur={() => onUpdateName(nameInput)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-sky-500"
                placeholder="Your display name"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={() => onTogglePvp(!(mpState?.pvpEnabled ?? true))}
                className={`w-full py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition ${
                  mpState?.pvpEnabled
                    ? 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                    : 'bg-emerald-950/70 border-emerald-500/60 text-emerald-300'
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>
                  {mpState?.pvpEnabled ? 'PvP Combat: Enabled' : 'Co-op Only (PvP Off)'}
                </span>
              </button>
            </div>
          </div>

          {/* Host / Join Controls */}
          {!mpState?.connected ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Host This Island World
                </div>
                <p className="text-xs text-stone-400">
                  Generates a short 6-letter code so friends sync directly to your buildings, vehicles, and combat.
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleHost}
                  className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-stone-950 font-bold text-sm transition"
                >
                  {busy ? 'Creating Room...' : 'Create P2P Room'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Join Friend&apos;s Room
                </div>
                <input
                  type="text"
                  maxLength={10}
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  placeholder="Enter Room Code (e.g. A7K9P2)"
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-sm font-mono text-stone-100 uppercase tracking-widest focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleJoin}
                  className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-stone-950 font-bold text-sm transition"
                >
                  {busy ? 'Connecting...' : 'Join Room'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-sky-950/30 border border-sky-500/40 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-sky-300">
                    Shareable Room Code
                  </div>
                  <div className="text-2xl font-mono font-extrabold text-white tracking-[0.2em]">
                    {mpState.roomCode}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyRoomCode}
                    className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-bold text-stone-100 flex items-center gap-1.5"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedCode ? 'Copied Code' : 'Copy Code'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={copyInviteLink}
                    className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-stone-950 flex items-center gap-1.5"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link Copied' : 'Copy Invite Link'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {errorText && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-700 text-xs text-red-200">
              {errorText}
            </div>
          )}

          {/* Connected Players */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-300">
              Survivors in Session ({1 + (mpState?.peers.length ?? 0)})
            </h3>
            <div className="space-y-1.5">
              <div className="p-2.5 rounded-xl bg-stone-950 border border-emerald-500/30 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-emerald-300">
                    {mpState?.playerName || nameInput} (You{mpState?.isHost ? ' · Host' : ''})
                  </span>
                  {mpState?.localSpeaking && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 font-bold text-[10px] animate-pulse flex items-center gap-1">
                      <Volume2 className="w-3 h-3" /> Speaking
                    </span>
                  )}
                </div>
                <span className="font-mono text-stone-400">Local</span>
              </div>
              {mpState?.peers.map((p) => {
                const isSpeaking = mpState?.speakingPeers?.includes(p.peerId);
                return (
                  <div
                    key={p.peerId}
                    className={`p-2.5 rounded-xl bg-stone-950 border flex items-center justify-between text-xs ${
                      isSpeaking ? 'border-emerald-500 bg-emerald-950/20' : 'border-stone-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-stone-100">{p.name}</span>
                      {isSpeaking && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-stone-950 font-bold text-[10px] animate-pulse flex items-center gap-1">
                          <Volume2 className="w-3 h-3" /> Speaking
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-stone-400">{p.biome}</span>
                      <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700/60 text-sky-300 font-mono flex items-center gap-1">
                        <Wifi className="w-3 h-3" />
                        {p.transport.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Room Chat */}
          <div className="p-3.5 rounded-xl bg-stone-950 border border-stone-800 space-y-2.5">
            <div className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
              <span>Island Radio Chat</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1 text-xs survival-scroll">
              {chatLog.length === 0 ? (
                <div className="text-stone-500 italic">No messages yet. Say hello!</div>
              ) : (
                chatLog.map((m, i) => (
                  <div key={`${m.time}_${i}`} className="text-stone-200">
                    <span className="font-bold text-amber-300">{m.name}: </span>
                    <span>{m.text}</span>
                  </div>
                ))
              )}
            </div>
            <form onSubmit={sendChat} className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Broadcast message to island peers..."
                className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-sky-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
