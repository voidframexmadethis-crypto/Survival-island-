import { NextRequest, NextResponse } from 'next/server';
import {
  authenticatePlayerAccount,
  createPlayerSessionToken,
  getAuthenticatedPlayer,
  getPlayerCookieName,
  registerPlayerAccount,
  toPublicPlayerProfile,
} from '@/lib/exchangeStore';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function attachSessionCookie(res: NextResponse, playerId: string): void {
  const token = createPlayerSessionToken(playerId);
  res.cookies.set(getPlayerCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
}

export async function GET(req: NextRequest) {
  const account = getAuthenticatedPlayer(req);
  if (!account) {
    return NextResponse.json({
      ok: true,
      authenticated: false,
      account: null,
    });
  }
  return NextResponse.json({
    ok: true,
    authenticated: true,
    account: toPublicPlayerProfile(account),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      mode?: 'login' | 'register';
      email?: string;
      password?: string;
      username?: string;
    };

    const mode = body.mode === 'register' ? 'register' : 'login';
    const result =
      mode === 'register'
        ? registerPlayerAccount({
            email: body.email || '',
            password: body.password || '',
            username: body.username,
          })
        : authenticatePlayerAccount({
            email: body.email || '',
            password: body.password || '',
          });

    if (!result.ok || !result.account) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Authentication failed.' },
        { status: result.status || 401 },
      );
    }

    const res = NextResponse.json({
      ok: true,
      authenticated: true,
      account: toPublicPlayerProfile(result.account),
    });
    attachSessionCookie(res, result.account.playerId);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid authentication payload.' },
      { status: 400 },
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, authenticated: false });
  res.cookies.set(getPlayerCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
