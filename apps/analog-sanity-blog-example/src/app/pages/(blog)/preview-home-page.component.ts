import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import { HomePageComponent } from './home-page.component';
import type { LoadResult } from './(home).server';
import {
  moreStoriesQuery,
  settingsQuery,
} from '@/analog-sanity-blog-example/sanity';
import { createLiveData } from '@limitless-angular/sanity/preview-kit';

@Component({
  selector: 'blog-preview-home-page',
  imports: [HomePageComponent],
  template: `<blog-home-page [data]="liveData()" />`,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PreviewHomePageComponent {
  data = input.required<LoadResult>();

  liveData = createLiveData(this.data, () => ({
    posts: { query: moreStoriesQuery, params: { limit: 100, skip: null } },
    settings: { query: settingsQuery },
  }));
}
