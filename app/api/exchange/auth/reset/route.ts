import { NextRequest, NextResponse } from 'next/server';
import {
  isDurableExchangeStoreConfigured,
  loadExchangeDb,
  resetPlayerPassword,
} from '@/lib/exchangeStore';

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
          'Account storage is not configured. Add MONGODB_URI in the deployment environment so accounts survive server restarts.',
      },
      { status: 503 },
    );
  }

  try {
    const body = (await req.json()) as {
      email?: string;
      recoveryCode?: string;
      newPassword?: string;
    };
    const result = await resetPlayerPassword({
      email: body.email || '',
      recoveryCode: body.recoveryCode || '',
      newPassword: body.newPassword || '',
    });
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Password reset failed.' },
        { status: result.status || 400 },
      );
    }
    return NextResponse.json({
      ok: true,
      recoveryCode: result.recoveryCode,
      message: 'Password updated. Save your new recovery code.',
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Password reset could not be completed.' },
      { status: 400 },
    );
  }
}
