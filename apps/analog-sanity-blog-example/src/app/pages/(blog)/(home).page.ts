import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
} from '@angular/core';
import { type ResolveFn } from '@angular/router';
import { type MetaTag, type RouteMeta } from '@analogjs/router';

import type { load, LoadResult } from './(home).server';
import { toPlainText } from '@limitless-angular/sanity/portabletext';
import { ROUTE_META_TAGS_KEY, ROUTE_TITLE_KEY } from '../../utils/meta-tags';
import { resolveOpenGraphImage } from '../../utils/resolve-open-graph-image';
import { generateMetaTags } from '../../utils/generate-metatags';
import { HomePageComponent } from './home-page.component';
import { PreviewHomePageComponent } from './preview-home-page.component';

// See https://discord.com/channels/994618831987290112/1276597066096840784
export const routeMeta: RouteMeta = {
  data: {
    [ROUTE_TITLE_KEY]: ((route) =>
      (route.data['load'] as LoadResult).settings?.title ??
      '') satisfies ResolveFn<string>,
    [ROUTE_META_TAGS_KEY]: ((route) => {
      const { settings } = route.data['load'] as LoadResult;
      const title = settings?.title ?? '';
      const description = toPlainText(settings?.description ?? []);
      const image = resolveOpenGraphImage(settings?.ogImage);
      return generateMetaTags({ title, description, image });
    }) satisfies ResolveFn<MetaTag[]>,
  },
};

@Component({
  standalone: true,
  imports: [HomePageComponent, PreviewHomePageComponent],
  template: `
    @if (draftMode()) {
      <blog-preview-home-page [data]="load()" />
    } @else {
      <blog-home-page [data]="load()" />
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePage {
  load = input.required<Awaited<ReturnType<typeof load>>>();

  draftMode = computed(() => this.load().draftMode);

  constructor() {
    effect(() => {
      console.log('Draft mode:', this.draftMode());
    });
  }
}
