import type { SanityClient } from '@sanity/client';

import { moreStoriesQuery, postBySlugQuery, settingsQuery } from './queries';

export async function getSettings(client: SanityClient) {
  return await client.fetch(settingsQuery);
}

export async function getPostBySlug(client: SanityClient, slug: string) {
  return await client.fetch(postBySlugQuery, { slug });
}

export async function getMoreStories(
  client: SanityClient,
  skip: string | null = null,
  limit = 100,
) {
  return await client.fetch(moreStoriesQuery, { skip, limit });
}
