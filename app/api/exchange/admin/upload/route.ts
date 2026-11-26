import { NextRequest, NextResponse } from 'next/server';
import { isAdminRequestAuthorized, loadExchangeDb } from '@/lib/exchangeStore';

const ALLOWED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4 MB
const MAX_MODEL_BYTES = 8 * 1024 * 1024; // 8 MB

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
    const formData = await req.formData();
    const file = formData.get('file');
    const kind = String(formData.get('kind') || 'image');

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: 'No file uploaded.' }, { status: 400 });
    }

    const fileName = file.name || 'upload';
    const lowerName = fileName.toLowerCase();

    if (kind === 'model3d') {
      if (!lowerName.endsWith('.glb') && !lowerName.endsWith('.gltf')) {
        return NextResponse.json(
          { ok: false, error: 'Only .glb or .gltf 3D model files are supported.' },
          { status: 400 },
        );
      }
      if (file.size > MAX_MODEL_BYTES) {
        return NextResponse.json(
          { ok: false, error: '3D model file exceeds 8 MB limit.' },
          { status: 400 },
        );
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const mime = lowerName.endsWith('.gltf')
        ? 'model/gltf+json'
        : 'model/gltf-binary';
      const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
      return NextResponse.json({
        ok: true,
        url: dataUrl,
        fileName,
        size: file.size,
      });
    }

    if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { ok: false, error: 'Only PNG, JPG, WEBP, or GIF images are supported.' },
        { status: 400 },
      );
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Image file exceeds 4 MB limit.' },
        { status: 400 },
      );
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buf.toString('base64')}`;
    return NextResponse.json({
      ok: true,
      url: dataUrl,
      fileName,
      size: file.size,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Upload failed.' }, { status: 500 });
  }
}
