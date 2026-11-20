import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedPlayer,
  getPayhipCheckoutForPlayer,
  markPayhipCheckoutPendingVerification,
} from '@/lib/exchangeStore';

export async function GET(req: NextRequest) {
  const account = getAuthenticatedPlayer(req);
  if (!account) {
    return NextResponse.json(
      { ok: false, authRequired: true, error: 'Authentication required.' },
      { status: 401 },
    );
  }

  const checkoutId = String(req.nextUrl.searchParams.get('checkoutId') || '').trim();
  if (!checkoutId) {
    return NextResponse.json(
      { ok: false, error: 'Missing checkoutId.' },
      { status: 400 },
    );
  }

  const checkout = getPayhipCheckoutForPlayer(account, checkoutId);
  if (!checkout) {
    return NextResponse.json(
      { ok: false, error: 'Checkout session not found for this account.' },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    checkoutId: checkout.checkoutId,
    productId: checkout.productId,
    status: checkout.status,
    statusMessage: checkout.statusMessage,
    delivered:
      checkout.status === 'delivered' &&
      account.ownedProductIds.includes(checkout.productId),
    owned: account.ownedProductIds.includes(checkout.productId),
    updatedAt: checkout.updatedAt,
  });
}

export async function POST(req: NextRequest) {
  const account = getAuthenticatedPlayer(req);
  if (!account) {
    return NextResponse.json(
      { ok: false, authRequired: true, error: 'Authentication required.' },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as { checkoutId?: string };
    const checkoutId = String(body.checkoutId || '').trim();
    if (!checkoutId) {
      return NextResponse.json({ ok: false, error: 'Missing checkoutId.' }, { status: 400 });
    }
    const checkout = markPayhipCheckoutPendingVerification(account, checkoutId);
    if (!checkout) {
      return NextResponse.json(
        { ok: false, error: 'Checkout session not found for this account.' },
        { status: 404 },
      );
    }
    return NextResponse.json({
      ok: true,
      checkoutId: checkout.checkoutId,
      productId: checkout.productId,
      status: checkout.status,
      statusMessage: checkout.statusMessage,
      owned: account.ownedProductIds.includes(checkout.productId),
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid status update request.' }, { status: 400 });
  }
}
