import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { type LoadResult } from './[slug].server';
import { PostPageComponent } from './post-page.component';
import {
  moreStoriesQuery,
  postBySlugQuery,
  settingsQuery,
} from '@/analog-sanity-blog-example/sanity';
import { createLiveData } from '@limitless-angular/sanity/preview-kit';

@Component({
  selector: 'blog-preview-post-page',
  standalone: true,
  template: `<blog-post-page [slug]="slug()" [data]="liveData()" />`,
  imports: [PostPageComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewPostPageComponent {
  slug = input.required<string>();

  data = input.required<LoadResult>();

  liveData = createLiveData(this.data, () => ({
    post: { query: postBySlugQuery, params: { slug: this.slug() } },
    settings: { query: settingsQuery },
    morePosts: {
      query: moreStoriesQuery,
      params: { skip: this.slug(), limit: 2 },
    },
  }));
}
