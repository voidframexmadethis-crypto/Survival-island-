'use client';

import React, { useState } from 'react';
import { LogIn, LogOut, UserCheck, UserPlus } from 'lucide-react';
import {
  PlayerProfileSummary,
  loginPlayerAccount,
  logoutPlayerAccount,
  registerPlayerAccount,
} from '@/game/systems/exchangeManager';

interface PlayerAccountAuthPanelProps {
  authenticated: boolean;
  account: PlayerProfileSummary | null;
  compact?: boolean;
  promptMessage?: string | null;
  onAuthenticated?: () => void;
}

export function PlayerAccountAuthPanel({
  authenticated,
  account,
  compact = false,
  promptMessage,
  onAuthenticated,
}: PlayerAccountAuthPanelProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  if (authenticated && account) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-500/35 bg-emerald-950/25 px-3 py-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <UserCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="truncate">
            <span className="font-bold text-emerald-200">{account.username}</span>
            <span className="text-stone-400 ml-1.5">({account.email})</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void logoutPlayerAccount()}
          className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-[11px] font-semibold text-stone-300 flex items-center gap-1"
        >
          <LogOut className="w-3 h-3" />
          <span>Sign Out</span>
        </button>
      </div>
    );
  }

  if (compact && !expanded) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-500/40 bg-amber-950/25 px-3 py-2 text-xs">
        <span className="text-amber-200 font-medium">
          {promptMessage || 'Sign in to save purchases & unlock skins across devices.'}
        </span>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-[11px] font-bold flex items-center gap-1"
        >
          <LogIn className="w-3 h-3" />
          <span>Sign In / Register</span>
        </button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res =
      mode === 'register'
        ? await registerPlayerAccount(email, password, username)
        : await loginPlayerAccount(email, password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error || 'Authentication failed.');
      return;
    }
    setPassword('');
    onAuthenticated?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-amber-500/45 bg-stone-900/95 p-3.5 space-y-2.5 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold text-amber-300 flex items-center gap-1.5">
          {mode === 'register' ? (
            <UserPlus className="w-4 h-4" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          <span>
            {mode === 'register'
              ? 'Create Survival Island Account'
              : 'Sign In to Survival Island Account'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
              mode === 'login'
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-800 text-stone-300'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
              mode === 'register'
                ? 'bg-amber-500 text-stone-950'
                : 'bg-stone-800 text-stone-300'
            }`}
          >
            Register
          </button>
        </div>
      </div>

      {promptMessage && (
        <p className="text-[11px] text-amber-200/90">{promptMessage}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {mode === 'register' && (
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Survivor name (optional)"
            className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-400 focus:outline-none"
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Account email"
          className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-400 focus:outline-none"
        />
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (min 6 chars)"
          className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-3 py-2 text-xs font-black uppercase text-stone-950"
        >
          {busy
            ? 'Please wait...'
            : mode === 'register'
              ? 'Create Account'
              : 'Sign In'}
        </button>
      </div>

      {error && <div className="text-[11px] font-semibold text-red-400">{error}</div>}
    </form>
  );
}
