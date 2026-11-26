/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_WEB_URL?: string;
  readonly VITE_COASTER_TRAIN_PROVIDER_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
