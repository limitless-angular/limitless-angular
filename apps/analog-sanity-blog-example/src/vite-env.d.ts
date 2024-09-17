/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly BYPASS_TOKEN: string;
  readonly SANITY_API_READ_TOKEN: string;
  readonly VITE_SANITY_PROJECT_ID: string;
  readonly VITE_SANITY_DATASET: string;
  readonly VITE_SANITY_API_VERSION: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
