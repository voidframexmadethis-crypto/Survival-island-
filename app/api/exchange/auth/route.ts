import { NextRequest, NextResponse } from 'next/server';
import {
  authenticatePlayerAccount,
  createPlayerSessionToken,
  getAuthenticatedPlayer,
  getPlayerCookieName,
  registerPlayerAccount,
  toPublicPlayerProfile,
} from '@/lib/exchangeStore';
import { isMobileAppOrigin } from '@/lib/mobileAppOrigins';

const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function attachSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(getPlayerCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  res.headers.set('Cache-Control', 'no-store');
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

    const sessionToken = createPlayerSessionToken(result.account.playerId);
    const res = NextResponse.json({
      ok: true,
      authenticated: true,
      account: toPublicPlayerProfile(result.account),
      // The website relies on the httpOnly cookie only. Never expose a bearer
      // token to the website, where script access would weaken that protection.
      ...(isMobileAppOrigin(req.headers.get('origin')) ? { sessionToken } : {}),
    });
    attachSessionCookie(res, sessionToken);
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
