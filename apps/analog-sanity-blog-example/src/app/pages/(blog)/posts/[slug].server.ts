import { PageServerLoad } from '@analogjs/router';

import { isDraftMode } from '../../../../server/utils/draft-mode';
import {
  getClient,
  getMoreStories,
  getPostBySlug,
  getSettings,
} from '@/analog-sanity-blog-example/sanity';

import { readToken } from '../../../../sanity/lib/token';

export const load = async ({ event, params }: PageServerLoad) => {
  const draftMode = isDraftMode(event);
  const client = getClient(draftMode ? { token: readToken } : undefined);
  const [post, settings, morePosts] = await Promise.all([
    getPostBySlug(client, params!['slug']),
    getSettings(client),
    getMoreStories(client, params!['slug'], 2),
  ]);

  return {
    loaded: true,
    post,
    settings,
    morePosts,
    draftMode,
    token: draftMode ? readToken : '',
  };
};

export type LoadResult = Awaited<ReturnType<typeof load>>;
