/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FARO_URL?: string;
  readonly VITE_FARO_APP_NAME?: string;
  readonly VITE_FARO_APP_VERSION?: string;
  readonly VITE_FARO_ENVIRONMENT?: string;
  readonly VITE_FARO_ENABLE_TRACING?: string;
  readonly VITE_AUTH_PROVIDER?: 'supabase' | 'django';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}