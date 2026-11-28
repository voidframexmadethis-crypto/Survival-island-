'use client';

import React, { useState } from 'react';
import { KeyRound, LogIn, LogOut, UserCheck, UserPlus } from 'lucide-react';
import {
  PlayerProfileSummary,
  loginPlayerAccount,
  logoutPlayerAccount,
  registerPlayerAccount,
  resetPlayerPassword,
} from '@/game/systems/exchangeManager';

interface PlayerAccountAuthPanelProps {
  authenticated: boolean;
  account: PlayerProfileSummary | null;
  compact?: boolean;
  promptMessage?: string | null;
  onAuthenticated?: () => void;
}

type AuthMode = 'login' | 'register' | 'reset';

const recoveryCodeNotice =
  'Save this recovery code somewhere private. It is shown once and is the only way to reset this password.';

export function PlayerAccountAuthPanel({
  authenticated,
  account,
  compact = false,
  promptMessage,
  onAuthenticated,
}: PlayerAccountAuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(!compact);

  const handleLogout = async () => {
    setError(null);
    setBusy(true);
    try {
      const res = await logoutPlayerAccount();
      if (!res.ok) {
        setError(res.error || 'Sign out failed. Please try again.');
        return;
      }
      setRecoveryCode(null);
      setPassword('');
    } catch {
      setError('Cannot reach the account server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (authenticated && account) {
    return (
      <div className="space-y-2">
        {recoveryCode && <RecoveryCodeBanner code={recoveryCode} />}
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
            onClick={() => void handleLogout()}
            disabled={busy}
            className="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-50 border border-stone-700 text-[11px] font-semibold text-stone-300 flex items-center gap-1"
          >
            <LogOut className="w-3 h-3" />
            <span>{busy ? 'Signing out…' : 'Sign Out'}</span>
          </button>
        </div>
        {error && <div className="text-[11px] font-semibold text-red-400">{error}</div>}
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

    try {
      if (mode === 'reset') {
        const res = await resetPlayerPassword(email, resetCode, newPassword);
        if (!res.ok) {
          setError(res.error || 'Password reset failed.');
          return;
        }
        setRecoveryCode(res.recoveryCode || null);
        setResetCode('');
        setNewPassword('');
        setPassword('');
        setMode('login');
        return;
      }

      const res =
        mode === 'register'
          ? await registerPlayerAccount(email, password, username)
          : await loginPlayerAccount(email, password);
      if (!res.ok) {
        setError(res.error || 'Authentication failed.');
        return;
      }
      if (
        mode === 'register' &&
        'recoveryCode' in res &&
        typeof res.recoveryCode === 'string'
      ) {
        setRecoveryCode(res.recoveryCode);
      }
      setPassword('');
      onAuthenticated?.();
    } catch {
      setError('Cannot reach the account server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setPassword('');
    setNewPassword('');
    setResetCode('');
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-amber-500/45 bg-stone-900/95 p-3.5 space-y-2.5 text-xs"
    >
      {recoveryCode && <RecoveryCodeBanner code={recoveryCode} />}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-bold text-amber-300 flex items-center gap-1.5">
          {mode === 'register' ? (
            <UserPlus className="w-4 h-4" />
          ) : mode === 'reset' ? (
            <KeyRound className="w-4 h-4" />
          ) : (
            <LogIn className="w-4 h-4" />
          )}
          <span>
            {mode === 'register'
              ? 'Create Survival Island Account'
              : mode === 'reset'
                ? 'Reset Survival Island Password'
                : 'Sign In to Survival Island Account'}
          </span>
        </div>
        {mode !== 'reset' && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => switchMode('login')}
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
              onClick={() => switchMode('register')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold ${
                mode === 'register'
                  ? 'bg-amber-500 text-stone-950'
                  : 'bg-stone-800 text-stone-300'
              }`}
            >
              Register
            </button>
          </div>
        )}
      </div>

      {promptMessage && (
        <p className="text-[11px] text-amber-200/90">{promptMessage}</p>
      )}

      {mode === 'reset' && (
        <p className="text-[11px] text-stone-400">
          Enter the recovery code shown when the account was created, then choose a new
          password. The code is replaced after every reset.
        </p>
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
          autoComplete="email"
          className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-400 focus:outline-none"
        />
        {mode === 'reset' ? (
          <>
            <input
              type="text"
              required
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value)}
              placeholder="Recovery code (XXXX-XXXX-XXXX)"
              autoComplete="one-time-code"
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs font-mono text-stone-100 placeholder-stone-500 focus:border-amber-400 focus:outline-none"
            />
            <input
              type="password"
              required
              minLength={6}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password (min 6 chars)"
              autoComplete="new-password"
              className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-400 focus:outline-none"
            />
          </>
        ) : (
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 6 chars)"
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            className="rounded-lg border border-stone-700 bg-stone-950 px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:border-amber-400 focus:outline-none"
          />
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 px-3 py-2 text-xs font-black uppercase text-stone-950"
        >
          {busy
            ? 'Please wait...'
            : mode === 'register'
              ? 'Create Account'
              : mode === 'reset'
                ? 'Reset Password'
                : 'Sign In'}
        </button>
      </div>

      {mode === 'login' && (
        <button
          type="button"
          onClick={() => switchMode('reset')}
          className="text-[11px] font-semibold text-amber-300 hover:text-amber-200 underline underline-offset-2"
        >
          Forgot password?
        </button>
      )}

      {mode === 'reset' && (
        <button
          type="button"
          onClick={() => switchMode('login')}
          className="text-[11px] font-semibold text-stone-400 hover:text-stone-200 underline underline-offset-2"
        >
          Back to sign in
        </button>
      )}

      {error && <div className="text-[11px] font-semibold text-red-400">{error}</div>}
    </form>
  );
}

function RecoveryCodeBanner({ code }: { code: string }) {
  return (
    <div className="rounded-xl border border-amber-400/60 bg-amber-950/40 p-3 text-[11px] text-amber-100 space-y-1.5">
      <div className="font-bold uppercase tracking-wide text-amber-300">Save your recovery code</div>
      <code className="block select-all rounded-lg border border-amber-500/40 bg-stone-950 px-3 py-2 font-mono text-base tracking-widest text-amber-200">
        {code}
      </code>
      <p className="text-amber-200/80">{recoveryCodeNotice}</p>
    </div>
  );
}
