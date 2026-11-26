import React from 'react';

type NextImageProps = Omit<
  React.ImgHTMLAttributes<HTMLImageElement>,
  'width' | 'height'
> & {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  fill?: boolean;
  priority?: boolean;
  quality?: number | string;
  sizes?: string;
  unoptimized?: boolean;
  placeholder?: 'blur' | 'empty';
  blurDataURL?: string;
  loader?: unknown;
};

/**
 * Capacitor's local bundle has no Next.js image optimizer. The game only uses
 * next/image for remote YouTube thumbnails, so a plain img preserves behavior.
 */
export default function Image({
  fill,
  priority,
  quality: _quality,
  sizes,
  unoptimized: _unoptimized,
  placeholder: _placeholder,
  blurDataURL: _blurDataURL,
  loader: _loader,
  style,
  ...rest
}: NextImageProps) {
  const fillStyle: React.CSSProperties | undefined = fill
    ? {
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        objectFit: 'cover',
      }
    : undefined;

  return (
    <img
      {...rest}
      sizes={sizes}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      style={{ ...fillStyle, ...style }}
    />
  );
}
