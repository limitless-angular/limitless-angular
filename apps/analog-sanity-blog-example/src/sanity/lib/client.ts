import { createClient, type SanityClient } from '@sanity/client';

import { apiVersion, dataset, projectId, studioUrl } from './api';

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true,
  perspective: 'published',
  stega: {
    studioUrl,
    logger: console,
    filter: (props) => {
      if (props.sourcePath.at(-1) === 'title') {
        return true;
      }

      return props.filterDefault(props);
    },
  },
});

export function getClient(preview?: { token: string }): SanityClient {
  const client = createClient({
    projectId,
    dataset,
    apiVersion,
    useCdn: true,
    perspective: 'published',
    stega: {
      enabled: !!preview?.token,
      studioUrl,
    },
  });
  if (preview) {
    if (!preview.token) {
      throw new Error('You must provide a token to preview drafts');
    }
    return client.withConfig({
      token: preview.token,
      useCdn: false,
      ignoreBrowserTokenWarning: true,
      perspective: 'previewDrafts',
    });
  }
  return client;
}
