import { NextRequest, NextResponse } from 'next/server';
import {
  createAdminSessionToken,
  getAdminAuthConfigStatus,
  getAdminCookieName,
  isAdminRequestAuthorized,
  verifyOrInitializeOwnerPassphrase,
} from '@/lib/exchangeStore';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    authenticated: isAdminRequestAuthorized(req),
    ...getAdminAuthConfigStatus(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { passphrase?: string; mode?: 'login' | 'setup' };
    const mode = body.mode === 'setup' ? 'setup' : 'login';
    const result = verifyOrInitializeOwnerPassphrase(body.passphrase || '', mode);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 401 });
    }

    const token = createAdminSessionToken();
    const res = NextResponse.json({ ok: true, authenticated: true });
    res.cookies.set(getAdminCookieName(), token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 12,
    });
    return res;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid authentication request.' }, { status: 400 });
  }
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
