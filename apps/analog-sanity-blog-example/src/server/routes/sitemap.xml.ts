import { defineEventHandler, setHeader, getRequestURL, useBase } from 'h3';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import { getClient } from '../../sanity/lib/client';

const client = getClient();

export type SanityPost = { slug: { current: string }; _updatedAt: string };

async function getSanityPosts(): Promise<SanityPost[]> {
  try {
    return client.fetch(`*[_type == "post"] { slug { current }, _updatedAt }`);
  } catch (error) {
    console.error('Error fetching Sanity posts:', error);
    return [];
  }
}

export default useBase(
  '/',
  defineEventHandler(async (event) => {
    console.log('Generating sitemap');
    const baseUrl = process.env['VERCEL_PROJECT_PRODUCTION_URL']
      ? `https://${process.env['VERCEL_PROJECT_PRODUCTION_URL']}`
      : getRequestURL(event);

    const posts = await getSanityPosts();

    const sitemap = new SitemapStream({ hostname: baseUrl.toString() });

    // Add the homepage
    sitemap.write({ url: '/', changefreq: 'daily', priority: 1 });

    // Add posts
    for (const post of posts) {
      sitemap.write({
        url: `/posts/${post.slug.current}`,
        lastmod: new Date(post._updatedAt).toISOString(),
        changefreq: 'weekly',
        priority: 0.7,
      });
    }

    sitemap.end();

    const sitemapOutput = await streamToPromise(Readable.from(sitemap));

    setHeader(event, 'content-type', 'application/xml');
    return sitemapOutput;
  }),
);
