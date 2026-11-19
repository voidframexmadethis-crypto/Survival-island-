import { NextRequest, NextResponse } from 'next/server';
import {
  getExchangeDb,
  getPaymentProviderStatus,
  isAdminRequestAuthorized,
} from '@/lib/exchangeStore';

export async function GET(req: NextRequest) {
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
