// Taken from https://github.com/analogjs/analog/blob/beta/packages/router/src/lib/meta-tags.ts with small modifications to read a resovefn and set the title
import { inject } from '@angular/core';
import {
  Meta,
  type MetaDefinition as NgMetaTag,
  Title,
} from '@angular/platform-browser';
import {
  type ActivatedRouteSnapshot,
  type MaybeAsync,
  NavigationEnd,
  Router,
  type RouterStateSnapshot,
} from '@angular/router';
import type { MetaTag } from '@analogjs/router';
import { filter } from 'rxjs/operators';
import { firstValueFrom, isObservable } from 'rxjs';

export const ROUTE_META_TAGS_KEY = Symbol('Route Meta Tags Key');

export const ROUTE_TITLE_KEY = Symbol('Route Title Key');

const CHARSET_KEY = 'charset';
// httpEquiv selector key needs to be in kebab case format
const HTTP_EQUIV_SELECTOR_KEY = 'http-equiv';
const NAME_KEY = 'name';
const PROPERTY_KEY = 'property';

type MetaTagSelector =
  | typeof CHARSET_KEY
  | `${
      | typeof HTTP_EQUIV_SELECTOR_KEY
      | typeof NAME_KEY
      | typeof PROPERTY_KEY}="${string}"`;
type MetaTagMap = Record<MetaTagSelector, MetaTag>;

export function updateMetaTagsOnRouteChange(): void {
  console.log('Updating meta tags on route change');
  const router = inject(Router);
  const titleService = inject(Title);
  const metaService = inject(Meta);

  router.events
    .pipe(filter((event) => event instanceof NavigationEnd))
    .subscribe(async () => {
      // For some reason setTitle and updateTag doesn't work with zone.js activated
      const snapshot = router.routerState.snapshot;
      const metaTagMap = await getMetaTagMap(snapshot.root, snapshot);
      for (const metaTagSelector in metaTagMap) {
        const metaTag = metaTagMap[
          metaTagSelector as MetaTagSelector
        ] as NgMetaTag;
        metaService.updateTag(metaTag, metaTagSelector);
      }

      const title = await getTitle(snapshot.root, snapshot);
      if (title) {
        titleService.setTitle(title);
      }
    });
}

async function getMetaTagMap(
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Promise<MetaTagMap> {
  const metaTagMap = {} as MetaTagMap;
  let currentRoute: ActivatedRouteSnapshot | null = route;

  while (currentRoute) {
    const metaTagsOrFn = currentRoute.data[ROUTE_META_TAGS_KEY];
    const metaTags =
      (await resolveFn<MetaTag[]>(metaTagsOrFn, currentRoute, state)) ?? [];
    for (const metaTag of metaTags) {
      metaTagMap[getMetaTagSelector(metaTag)] = metaTag;
    }

    currentRoute = currentRoute.firstChild;
  }

  return metaTagMap;
}

function getMetaTagSelector(metaTag: MetaTag): MetaTagSelector {
  if (metaTag.name) {
    return `${NAME_KEY}="${metaTag.name}"`;
  }

  if (metaTag.property) {
    return `${PROPERTY_KEY}="${metaTag.property}"`;
  }

  if (metaTag.httpEquiv) {
    return `${HTTP_EQUIV_SELECTOR_KEY}="${metaTag.httpEquiv}"`;
  }

  return CHARSET_KEY;
}

async function resolveFn<T = any>(
  dataOrFn: any,
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Promise<T | null> {
  if (typeof dataOrFn !== 'function') {
    return dataOrFn ?? null;
  }

  const result = dataOrFn(route, state) as MaybeAsync<T>;
  return isObservable(result) ? firstValueFrom(result) : result;
}

async function getTitle(
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
): Promise<string | null> {
  let title: string | null = null;
  let currentRoute: ActivatedRouteSnapshot | null = route;

  while (currentRoute) {
    const titleOrFn = currentRoute.data[ROUTE_TITLE_KEY];
    title = await resolveFn(titleOrFn, currentRoute, state);
    if (title) {
      break;
    }

    currentRoute = currentRoute.firstChild;
  }

  return title;
}
