export const MARKETPLACE_UPLOAD_MAX_BYTES = 8 * 1024 * 1024;

export type MarketplaceUploadKind = 'image' | 'glb';

export interface MarketplaceUploadFileLike {
  name: string;
  type?: string;
  size: number;
}

export type MarketplaceUploadCheck =
  | { ok: true; kind: MarketplaceUploadKind }
  | { ok: false; message: string };

const IMAGE_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]);

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif']);

export function formatMarketplaceUploadSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function checkMarketplaceUploadFile(
  file: MarketplaceUploadFileLike,
): MarketplaceUploadCheck {
  if (!file.name.trim() || !Number.isFinite(file.size) || file.size <= 0) {
    return { ok: false, message: 'Choose a non-empty image or 3D model file.' };
  }
  if (file.size > MARKETPLACE_UPLOAD_MAX_BYTES) {
    return {
      ok: false,
      message: `That file is ${formatMarketplaceUploadSize(file.size)}. Keep uploads under ${formatMarketplaceUploadSize(MARKETPLACE_UPLOAD_MAX_BYTES)}.`,
    };
  }

  const name = file.name.toLowerCase();
  const extension = name.slice(name.lastIndexOf('.'));
  const mime = (file.type || '').toLowerCase();

  if (extension === '.glb' || extension === '.gltf') {
    return { ok: true, kind: 'glb' };
  }
  if (IMAGE_EXTENSIONS.has(extension) || IMAGE_MIME_TYPES.has(mime)) {
    return { ok: true, kind: 'image' };
  }

  return {
    ok: false,
    message: 'Upload a PNG, JPG, WEBP, GIF, GLB or GLTF file.',
  };
}
