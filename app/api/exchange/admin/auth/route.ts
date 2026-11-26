import { NextRequest, NextResponse } from 'next/server';
import {
  authenticateOwnerAccount,
  createAdminSessionToken,
  createOwnerAccount,
  getAdminAuthConfigStatus,
  getAdminCookieName,
  isAdminRequestAuthorized,
  isDurableExchangeStoreConfigured,
  loadExchangeDb,
} from '@/lib/exchangeStore';

export async function GET(req: NextRequest) {
  try {
    await loadExchangeDb();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Account database is unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }
  return NextResponse.json({
    authenticated: isAdminRequestAuthorized(req),
    ...getAdminAuthConfigStatus(),
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

  if (!isDurableExchangeStoreConfigured() && process.env.NODE_ENV === 'production') {
    return NextResponse.json(
      {
        ok: false,
        error:
          'Account storage is not configured. Add MONGODB_URI in the deployment environment so owner access survives restarts.',
      },
      { status: 503 },
    );
  }

  let body: {
    mode?: 'login' | 'setup';
    email?: string;
    password?: string;
    username?: string;
    setupCode?: string;
  };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid authentication request.' },
      { status: 400 },
    );
  }

  const mode = body.mode === 'setup' ? 'setup' : 'login';
  const result =
    mode === 'setup'
      ? await createOwnerAccount({
          email: body.email || '',
          password: body.password || '',
          username: body.username,
          setupCode: body.setupCode,
        })
      : authenticateOwnerAccount({
          email: body.email || '',
          password: body.password || '',
        });

  if (!result.ok || !result.account) {
    return NextResponse.json(
      { ok: false, error: result.error || 'Owner authentication failed.' },
      { status: result.status || 401 },
    );
  }

  const recoveryCode =
    'recoveryCode' in result && typeof result.recoveryCode === 'string'
      ? result.recoveryCode
      : undefined;
  const token = createAdminSessionToken(result.account);
  const res = NextResponse.json({
    ok: true,
    authenticated: true,
    account: {
      playerId: result.account.playerId,
      username: result.account.username || 'Owner',
      email: result.account.email || '',
      role: 'owner' as const,
    },
    ...(recoveryCode ? { recoveryCode } : {}),
  });
  res.cookies.set(getAdminCookieName(), token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true, authenticated: false });
  res.cookies.set(getAdminCookieName(), '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return res;
}
