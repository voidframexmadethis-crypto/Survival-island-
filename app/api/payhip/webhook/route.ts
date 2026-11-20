import { NextRequest, NextResponse } from 'next/server';
import {
  processPayhipWebhookEvent,
  verifyPayhipWebhookSignature,
} from '@/lib/exchangeStore';

/**
 * Server-side Payhip webhook handler.
 * Listens for: paid, refunded, and failed events.
 * Security:
 *  - Verifies SHA-256 signature against PAYHIP_API_KEY
 *  - Never trusts client-side redirects or browser callbacks
 *  - Deduplicates transactions with persistent idempotency records
 *  - Returns HTTP 200 upon successful verification & processing
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  let payload: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return NextResponse.json(
        { ok: false, error: 'Invalid JSON webhook payload.' },
        { status: 400 },
      );
    }
    payload = parsed as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Malformed JSON body.' },
      { status: 400 },
    );
  }

  const headerSig =
    req.headers.get('x-payhip-signature') ||
    req.headers.get('x-webhook-signature') ||
    null;

  const sigCheck = verifyPayhipWebhookSignature(rawBody, payload, headerSig);
  if (!sigCheck.ok) {
    return NextResponse.json(
      { ok: false, error: sigCheck.error || 'Signature verification failed.' },
      { status: sigCheck.status || 401 },
    );
  }

  const result = processPayhipWebhookEvent(payload);
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error || 'Webhook processing error.' },
      { status: result.statusCode },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      duplicate: Boolean(result.duplicate),
      status: result.status,
      playerId: result.playerId,
      productId: result.productId,
      transactionId: result.transactionId,
    },
    { status: 200 },
  );
}
