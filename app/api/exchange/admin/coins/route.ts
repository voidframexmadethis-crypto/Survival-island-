import { NextRequest, NextResponse } from 'next/server';
import { CoinPackage } from '@/game/data/exchangeCatalog';
import {
  getExchangeDb,
  isAdminRequestAuthorized,
  normalizeCoinPackageInput,
  persistExchangeDb,
} from '@/lib/exchangeStore';

export async function POST(req: NextRequest) {
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Owner authorization required.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<CoinPackage>;
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ ok: false, error: 'Package name is required.' }, { status: 400 });
    }
    const pkg = normalizeCoinPackageInput(body);
    const db = getExchangeDb();
    db.coinPackages.push(pkg);
    persistExchangeDb();

    return NextResponse.json({ ok: true, coinPackage: pkg }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid coin package payload.' }, { status: 400 });
  }
}
