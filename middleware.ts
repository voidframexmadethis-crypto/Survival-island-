import { NextRequest, NextResponse } from 'next/server';
import { getMobileAppOrigins } from '@/lib/mobileAppOrigins';

function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin || !getMobileAppOrigins().has(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export function middleware(request: NextRequest) {
  const headers = corsHeaders(request.headers.get('origin'));

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export const config = {
  matcher: '/api/:path*',
};
