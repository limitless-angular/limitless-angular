import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
} from '@angular/core';

import { type LoadResult } from './[slug].server';
import { type ResolveFn } from '@angular/router';
import { PreviewPostPageComponent } from './preview-post-page.component';
import { PostPageComponent } from './post-page.component';
import { type MetaTag, RouteMeta } from '@analogjs/router';
import { ROUTE_META_TAGS_KEY, ROUTE_TITLE_KEY } from '../../../utils/meta-tags';
import { toPlainText } from '@limitless-angular/sanity/portabletext';
import { resolveOpenGraphImage } from '../../../utils/resolve-open-graph-image';
import { generateMetaTags } from '../../../utils/generate-metatags';
import { demo } from '@/analog-sanity-blog-example/sanity';

// See https://discord.com/channels/994618831987290112/1276597066096840784
export const routeMeta: RouteMeta = {
  data: {
    [ROUTE_TITLE_KEY]: ((route) => {
      const { settings, post } = route.data['load'] as LoadResult;
      const title = settings?.title ?? demo.title;
      return post?.title ? `${post.title} | ${title}` : title;
    }) satisfies ResolveFn<string>,
    [ROUTE_META_TAGS_KEY]: ((route) => {
      const { settings, post } = route.data['load'] as LoadResult;
      const title = settings?.title ?? '';
      const description = toPlainText(settings?.description ?? []);
      const image = resolveOpenGraphImage(post?.coverImage);
      return generateMetaTags({
        title: post?.title ? `${post.title} | ${title}` : title,
        description: post?.excerpt ?? description,
        image,
      });
    }) satisfies ResolveFn<MetaTag[]>,
  },
};

@Component({
  standalone: true,
  template: `
    @if (draftMode()) {
      <preview-post-page [slug]="slug()" [data]="load()" />
    } @else {
      <post-page [slug]="slug()" [data]="load()" />
    }
  `,
  imports: [PreviewPostPageComponent, PostPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class PostPage {
  slug = input.required<string>();

  load = input.required<LoadResult>();

  draftMode = computed(() => this.load().draftMode);
}
