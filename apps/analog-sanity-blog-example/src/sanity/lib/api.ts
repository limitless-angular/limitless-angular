import { createSanityBlogConfig } from '@limitless-angular/analog-sanity-blog/env';

export const { apiVersion, dataset, projectId, studioUrl } =
  createSanityBlogConfig(import.meta.env);
