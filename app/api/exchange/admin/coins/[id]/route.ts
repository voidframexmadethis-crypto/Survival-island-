import { NextRequest, NextResponse } from 'next/server';
import { CoinPackage } from '@/game/data/exchangeCatalog';
import {
  getExchangeDb,
  isAdminRequestAuthorized,
  loadExchangeDb,
  normalizeCoinPackageInput,
  persistExchangeDb,
} from '@/lib/exchangeStore';

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const db = getExchangeDb();
  const idx = db.coinPackages.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: 'Coin package not found.' }, { status: 404 });
  }

  try {
    const body = (await req.json()) as Partial<CoinPackage>;
    const updated = normalizeCoinPackageInput(body, db.coinPackages[idx]);
    if (!updated.name) {
      return NextResponse.json({ ok: false, error: 'Package name cannot be empty.' }, { status: 400 });
    }
    db.coinPackages[idx] = updated;
    await persistExchangeDb();

    return NextResponse.json({ ok: true, coinPackage: updated });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid coin package update.' }, { status: 400 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
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

  const { id } = await context.params;
  const db = getExchangeDb();
  const idx = db.coinPackages.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: 'Coin package not found.' }, { status: 404 });
  }

  db.coinPackages.splice(idx, 1);
  await persistExchangeDb();

  return NextResponse.json({ ok: true, deletedId: id });
}
