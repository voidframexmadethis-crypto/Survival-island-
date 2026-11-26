import { Capacitor } from '@capacitor/core';
import { configureMobileRuntime } from '@/game/systems/apiConfig';

const PRODUCTION_ORIGIN = 'https://survival-island-nu.vercel.app';

const apiBaseUrl = (
  import.meta.env.VITE_API_BASE_URL || PRODUCTION_ORIGIN
).replace(/\/+$/, '');
const webUrl = (import.meta.env.VITE_WEB_URL || PRODUCTION_ORIGIN).replace(/\/+$/, '');

configureMobileRuntime({
  apiBaseUrl,
  webUrl,
  native: Capacitor.isNativePlatform(),
});

export const MOBILE_API_BASE_URL = apiBaseUrl;
export const MOBILE_WEB_URL = webUrl;
