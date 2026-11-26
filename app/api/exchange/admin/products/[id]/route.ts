import { NextRequest, NextResponse } from 'next/server';
import { ExchangeProduct } from '@/game/data/exchangeCatalog';
import {
  getExchangeDb,
  isAdminRequestAuthorized,
  loadExchangeDb,
  normalizeProductInput,
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
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: 'Product not found.' }, { status: 404 });
  }

  try {
    const body = (await req.json()) as Partial<ExchangeProduct>;
    const updated = normalizeProductInput(body, db.products[idx]);
    if (!updated.name) {
      return NextResponse.json({ ok: false, error: 'Product name cannot be empty.' }, { status: 400 });
    }
    db.products[idx] = updated;
    await persistExchangeDb();

    return NextResponse.json({ ok: true, product: updated });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid update payload.' }, { status: 400 });
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
  const idx = db.products.findIndex((p) => p.id === id);
  if (idx === -1) {
    return NextResponse.json({ ok: false, error: 'Product not found.' }, { status: 404 });
  }

  // Note: Players who already purchased this product retain ownership via ownedProductSnapshots
  db.products.splice(idx, 1);
  await persistExchangeDb();

  return NextResponse.json({ ok: true, deletedId: id });
}
