import { NextRequest, NextResponse } from 'next/server';
import { ExchangeProduct } from '@/game/data/exchangeCatalog';
import {
  getExchangeDb,
  isAdminRequestAuthorized,
  loadExchangeDb,
  normalizeProductInput,
  persistExchangeDb,
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
  if (!isAdminRequestAuthorized(req)) {
    return NextResponse.json({ ok: false, error: 'Owner authorization required.' }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Partial<ExchangeProduct>;
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ ok: false, error: 'Product name is required.' }, { status: 400 });
    }
    if (
      body.category !== 'gun_skin' &&
      body.category !== 'backpack_skin' &&
      body.category !== 'cosmetic'
    ) {
      return NextResponse.json(
        { ok: false, error: 'Category must be Gun Skins, Backpack Skins, or Cosmetics.' },
        { status: 400 },
      );
    }

    const product = normalizeProductInput(body);
    const db = getExchangeDb();
    db.products.unshift(product);
    await persistExchangeDb();

    return NextResponse.json({ ok: true, product }, { status: 201 });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid product payload.' }, { status: 400 });
  }
}
