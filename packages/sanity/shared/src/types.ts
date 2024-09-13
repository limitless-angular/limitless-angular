import type { SanityClient } from '@sanity/client';

export interface SanityConfig {
  projectId: string;
  dataset: string;
}

export type SanityClientFactory = (preview?: { token: string }) => SanityClient;
