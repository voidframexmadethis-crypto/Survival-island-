const DEFAULT_MOBILE_ORIGINS = [
  'capacitor://localhost',
  'https://localhost',
  'http://localhost:4173',
  'http://localhost:5174',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:5174',
];

export function getMobileAppOrigins(): Set<string> {
  const configured = (process.env.MOBILE_APP_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_MOBILE_ORIGINS, ...configured]);
}

export function isMobileAppOrigin(origin: string | null | undefined): boolean {
  return Boolean(origin && getMobileAppOrigins().has(origin));
}
