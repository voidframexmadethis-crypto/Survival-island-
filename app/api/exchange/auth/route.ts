import { NextRequest, NextResponse } from 'next/server';
import {
  authenticatePlayerAccount,
  createPlayerSessionToken,
  getAuthenticatedPlayer,
  getPlayerCookieName,
  isDurableExchangeStoreConfigured,
  loadExchangeDb,
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
  try {
    await loadExchangeDb();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Account database is unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

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
    await loadExchangeDb();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Account database is unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }

  let body: {
    mode?: 'login' | 'register';
    email?: string;
    password?: string;
    username?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid authentication payload.' },
      { status: 400 },
    );
  }

  if (!isDurableExchangeStoreConfigured() && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Account storage is not configured. Add MONGODB_URI in the deployment environment so accounts survive server restarts.',
      },
      { status: 503 },
    );
  }

  try {
    const mode = body.mode === 'register' ? 'register' : 'login';
    const result =
      mode === 'register'
        ? await registerPlayerAccount({
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

    const recoveryCode =
      'recoveryCode' in result && typeof result.recoveryCode === 'string'
        ? result.recoveryCode
        : undefined;
    const sessionToken = createPlayerSessionToken(
      result.account.playerId,
      result.account.sessionVersion ?? 0,
    );
    const res = NextResponse.json({
      ok: true,
      authenticated: true,
      account: toPublicPlayerProfile(result.account),
      ...(recoveryCode ? { recoveryCode } : {}),
      // The website relies on the httpOnly cookie only. Never expose a bearer
      // token to the website, where script access would weaken that protection.
      ...(isMobileAppOrigin(req.headers.get('origin')) ? { sessionToken } : {}),
    });
    attachSessionCookie(res, sessionToken);
    return res;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Registration or sign-in could not be completed.' },
      { status: 500 },
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
