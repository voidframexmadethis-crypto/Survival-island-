import { NextRequest, NextResponse } from 'next/server';
import {
  createPayhipCheckoutForPlayer,
  flushExchangeDb,
  getAuthenticatedPlayer,
  loadExchangeDb,
} from '@/lib/exchangeStore';

export async function POST(req: NextRequest) {
  try {
    await loadExchangeDb();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Exchange database is unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }
  const account = getAuthenticatedPlayer(req);
  if (!account) {
    return NextResponse.json(
      {
        ok: false,
        authRequired: true,
        error: 'Sign in to your Survival Island account before purchasing items.',
      },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as { productId?: string };
    const productId = String(body.productId || '').trim();
    if (!productId) {
      return NextResponse.json(
        { ok: false, error: 'Missing productId.' },
        { status: 400 },
      );
    }

    const result = createPayhipCheckoutForPlayer(account, productId);
    await flushExchangeDb();
    if (!result.ok || !result.checkout) {
      return NextResponse.json(
        { ok: false, error: result.error || 'Could not initiate Payhip checkout.' },
        { status: result.status || 400 },
      );
    }

    return NextResponse.json({
      ok: true,
      checkoutId: result.checkout.checkoutId,
      checkoutUrl: result.checkoutUrl,
      status: result.checkout.status,
      statusMessage: result.checkout.statusMessage,
      productId: result.checkout.productId,
      playerId: result.checkout.playerId,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid Payhip checkout request.' },
      { status: 400 },
    );
  }
}
