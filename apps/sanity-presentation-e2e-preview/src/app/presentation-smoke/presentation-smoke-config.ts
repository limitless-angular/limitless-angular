import type { InitializedClientConfig, SyncTag } from '@sanity/client';

export const presentationSmokeDocumentId = 'presentation-smoke-post';
export const presentationSmokeInitialTitle = 'Initial presentation smoke title';
export const presentationSmokeLiveTitle = 'Live presentation smoke title';
export const presentationSmokeQuery = '*[_id == $id][0]{title}';
export const presentationSmokeSyncTag =
  's1:presentation-smoke-post' satisfies SyncTag;
export const presentationSmokeApiVersion = '2024-02-28';

export type PresentationSmokeMode = 'fake-client' | 'real-client';

export type PresentationSmokeDocument = {
  _id: string;
  _type: 'post';
  title: string;
};

export type PresentationSmokeConfig = {
  apiVersion: string;
  dataset: string;
  document: PresentationSmokeDocument;
  mode: PresentationSmokeMode;
  projectId: string;
  studioUrl: string;
  token: string;
};

type PresentationSmokeWindow = Window & {
  __presentationSmokeConfig?: PresentationSmokeConfig;
};

const defaultProjectId = 'presentation-smoke-project';
const defaultDataset = 'presentation-smoke-dataset';
const defaultStudioUrl = 'http://localhost:3333';
const defaultToken = 'presentation-smoke-token';

export function getPresentationSmokeConfig(): PresentationSmokeConfig {
  if (typeof window !== 'undefined') {
    const config = (window as PresentationSmokeWindow)
      .__presentationSmokeConfig;

    if (config) {
      return config;
    }
  }

  const mode =
    getProcessEnv('SANITY_PRESENTATION_E2E_REAL_CLIENT') === '1'
      ? 'real-client'
      : 'fake-client';

  return {
    apiVersion:
      getProcessEnv('VITE_SANITY_API_VERSION') ?? presentationSmokeApiVersion,
    dataset: getProcessEnv('VITE_SANITY_DATASET') ?? defaultDataset,
    document: createDefaultPresentationSmokeDocument(),
    mode,
    projectId: getProcessEnv('VITE_SANITY_PROJECT_ID') ?? defaultProjectId,
    studioUrl: getProcessEnv('VITE_SANITY_STUDIO_URL') ?? defaultStudioUrl,
    token:
      mode === 'real-client'
        ? (getProcessEnv('SANITY_API_READ_TOKEN') ?? '')
        : defaultToken,
  };
}

export function getPresentationSmokeClientConfig(
  config = getPresentationSmokeConfig(),
): Required<InitializedClientConfig> {
  return {
    apiVersion: config.apiVersion,
    dataset: config.dataset,
    perspective: 'drafts',
    projectId: config.projectId,
    resultSourceMap: true,
    useCdn: false,
  } as unknown as Required<InitializedClientConfig>;
}

export function createDefaultPresentationSmokeDocument(): PresentationSmokeDocument {
  return {
    _id: presentationSmokeDocumentId,
    _type: 'post',
    title: presentationSmokeLiveTitle,
  };
}

function getProcessEnv(name: string): string | undefined {
  if (typeof process === 'undefined') {
    return undefined;
  }

  const value = process.env[name]?.trim();
  return value || undefined;
}
