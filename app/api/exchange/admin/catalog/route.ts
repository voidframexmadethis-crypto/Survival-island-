import { NextRequest, NextResponse } from 'next/server';
import {
  getExchangeDb,
  getPaymentProviderStatus,
  isAdminRequestAuthorized,
  loadExchangeDb,
} from '@/lib/exchangeStore';

export async function GET(req: NextRequest) {
  try {
    await loadExchangeDb();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Exchange database is unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Owner authorization required.' }, { status: 401 });
  }

  const db = getExchangeDb();
  return NextResponse.json({
    ok: true,
    products: db.products,
    coinPackages: db.coinPackages,
    transactions: db.transactions.slice(0, 100),
    paymentProvider: getPaymentProviderStatus(),
  });
}
