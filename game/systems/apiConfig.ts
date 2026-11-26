declare global {
  interface Window {
    __SI_API_BASE_URL__?: string;
    __SI_WEB_URL__?: string;
    __SI_NATIVE__?: boolean;
  }
}

export interface MobileRuntimeConfig {
  apiBaseUrl: string;
  webUrl: string;
  native: boolean;
}

export function configureMobileRuntime(config: MobileRuntimeConfig): void {
  if (typeof window === 'undefined') return;
  window.__SI_API_BASE_URL__ = config.apiBaseUrl.replace(/\/+$/, '');
  window.__SI_WEB_URL__ = config.webUrl.replace(/\/+$/, '');
  window.__SI_NATIVE__ = config.native;
}

export function getApiBaseUrl(): string {
  if (typeof window === 'undefined') return '';
  return (window.__SI_API_BASE_URL__ || '').replace(/\/+$/, '');
}

/** On the website this stays relative; in Capacitor it resolves to Vercel. */
export function apiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const base = getApiBaseUrl();
  if (!base) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function getWebUrl(): string {
  if (typeof window === 'undefined') return '';
  return (window.__SI_WEB_URL__ || window.location.origin).replace(/\/+$/, '');
}

export function isNativeMobileApp(): boolean {
  return typeof window !== 'undefined' && window.__SI_NATIVE__ === true;
}
