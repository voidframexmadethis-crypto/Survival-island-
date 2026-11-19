import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getExchangeDb,
  getOrCreatePlayerAccount,
  persistExchangeDb,
  sanitizePlayerId,
} from '@/lib/exchangeStore';

/**
 * Payment-provider webhook receiver.
 * Verifies HMAC-SHA256 signature against PAYMENT_WEBHOOK_SECRET before crediting any SI Coins.
 * Prevents duplicate credits using idempotent providerReference checks.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET?.trim();
  if (!webhookSecret) {
    return NextResponse.json(
      { ok: false, error: 'PAYMENT_WEBHOOK_SECRET is not configured on the server.' },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const signatureHeader = req.headers.get('x-exchange-webhook-signature') || '';
  const expectedSig = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const sigBuf = Buffer.from(signatureHeader, 'utf8');
  const expBuf = Buffer.from(expectedSig, 'utf8');
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return NextResponse.json({ ok: false, error: 'Invalid webhook signature.' }, { status: 401 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      eventType?: string;
      playerId?: string;
      packageId?: string;
      provider?: string;
      providerReference?: string;
    };

    if (event.eventType !== 'payment.succeeded') {
      return NextResponse.json({ ok: true, ignored: true });
    }

    const providerRef = String(event.providerReference || '').trim();
    const packageId = String(event.packageId || '').trim();
    const playerId = sanitizePlayerId(event.playerId);

    if (!providerRef || !packageId) {
      return NextResponse.json(
        { ok: false, error: 'Missing providerReference or packageId.' },
        { status: 400 },
      );
    }

    const db = getExchangeDb();
    // Idempotency guard: never double-credit the same provider transaction
    if (
      db.transactions.some(
        (t) =>
          t.type === 'coin_purchase_verified' && t.providerReference === providerRef,
      )
    ) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const pkg = db.coinPackages.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ ok: false, error: 'Coin package not found.' }, { status: 404 });
    }

    const totalCoins = pkg.coins + (pkg.bonusCoins || 0);
    const account = getOrCreatePlayerAccount(playerId);
    account.coinBalance += totalCoins;
    account.updatedAt = Date.now();

    const tx = {
      id: `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'coin_purchase_verified' as const,
      playerId: account.playerId,
      packageId: pkg.id,
      itemName: pkg.name,
      coinDelta: totalCoins,
      realMoneyAmount: pkg.priceAmount,
      currency: pkg.currency,
      status: 'completed' as const,
      provider: event.provider || process.env.PAYMENT_PROVIDER || 'verified_provider',
      providerReference: providerRef,
      createdAt: Date.now(),
      note: `Verified payment credited +${totalCoins.toLocaleString()} SI Coins.`,
    };
    db.transactions.unshift(tx);
    if (db.transactions.length > 500) db.transactions.length = 500;
    persistExchangeDb();

    return NextResponse.json({
      ok: true,
      coinBalance: account.coinBalance,
      transactionId: tx.id,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Malformed webhook payload.' }, { status: 400 });
  }
}
