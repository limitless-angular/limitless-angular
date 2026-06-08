export interface SanityBlogEnv {
  readonly VITE_SANITY_API_VERSION?: string;
  readonly VITE_SANITY_DATASET?: string;
  readonly VITE_SANITY_PROJECT_ID?: string;
  readonly VITE_SANITY_STUDIO_URL?: string;
}

export interface SanityBlogConfig {
  readonly apiVersion: string;
  readonly dataset: string;
  readonly projectId: string;
  readonly studioUrl: string;
}

export function createSanityBlogConfig(env: SanityBlogEnv): SanityBlogConfig {
  return {
    apiVersion: env.VITE_SANITY_API_VERSION || '2024-02-28',
    dataset: assertValue(
      env.VITE_SANITY_DATASET,
      'Missing environment variable: VITE_SANITY_DATASET',
    ),
    projectId: assertValue(
      env.VITE_SANITY_PROJECT_ID,
      'Missing environment variable: VITE_SANITY_PROJECT_ID',
    ),
    studioUrl: env.VITE_SANITY_STUDIO_URL || 'http://localhost:3333',
  };
}

function assertValue<T>(value: T | undefined, errorMessage: string): T {
  if (value === undefined) {
    throw new Error(errorMessage);
  }

  return value;
}
