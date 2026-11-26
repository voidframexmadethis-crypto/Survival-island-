import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedPlayer,
  getExchangeDb,
  getPaymentProviderStatus,
  loadExchangeDb,
  persistExchangeDb,
} from '@/lib/exchangeStore';

/**
 * SI Coin checkout preview endpoint.
 * Real-money product purchases use Payhip checkout (/api/exchange/payhip/checkout + /api/payhip/webhook).
 */
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
        error: 'Please sign in to your Survival Island account before purchasing SI Coins.',
      },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as { packageId?: string };
    const packageId = String(body.packageId || '').trim();
    if (!packageId) {
      return NextResponse.json({ ok: false, error: 'Missing packageId.' }, { status: 400 });
    }

    const db = getExchangeDb();
    const pkg = db.coinPackages.find((p) => p.id === packageId && p.active);
    if (!pkg) {
      return NextResponse.json(
        { ok: false, error: 'Coin package not found or inactive.' },
        { status: 404 },
      );
    }

    const providerStatus = getPaymentProviderStatus();
    const totalCoins = pkg.coins + (pkg.bonusCoins || 0);

    const tx = {
      id: `checkout_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      type: 'coin_checkout_pending' as const,
      playerId: account.playerId,
      packageId: pkg.id,
      itemName: pkg.name,
      coinDelta: 0, // Strictly 0 until payment provider webhook confirms payment
      realMoneyAmount: pkg.priceAmount,
      currency: pkg.currency,
      status: 'pending_provider' as const,
      provider: providerStatus.provider || 'unconfigured',
      createdAt: Date.now(),
      note: providerStatus.configured
        ? `Awaiting ${providerStatus.provider} payment verification for ${totalCoins.toLocaleString()} SI Coins.`
        : 'Real-money payment provider not yet connected. No coins were credited.',
    };

    db.transactions.unshift(tx);
    if (db.transactions.length > 500) db.transactions.length = 500;
    await persistExchangeDb();

    if (!providerStatus.configured) {
      return NextResponse.json(
        {
          ok: false,
          demoMode: true,
          providerRequired: true,
          transactionId: tx.id,
          message:
            'Demo Mode: Live real-money payment processing is not connected yet, so no charge was made and no SI Coins were credited. Your coin package and pricing are saved and ready whenever you choose to connect a payment provider.',
        },
        { status: 200 },
      );
    }

    return NextResponse.json({
      ok: true,
      transactionId: tx.id,
      status: 'pending_provider',
      provider: providerStatus.provider,
      message:
        'Checkout session logged. SI Coins will be credited automatically once the payment provider verifies payment via webhook.',
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid coin checkout request.' },
      { status: 400 },
    );
  }
}
