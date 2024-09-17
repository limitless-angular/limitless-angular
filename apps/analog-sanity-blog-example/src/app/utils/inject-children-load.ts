import { inject, Injector } from '@angular/core';
import { ActivatedRoute, Data, Router, NavigationEnd } from '@angular/router';

import { map, Observable, switchMap, startWith } from 'rxjs';
import { filter } from 'rxjs/operators';

function getDeepestLoadData(currentRoute: ActivatedRoute): Observable<Data> {
  return currentRoute.firstChild
    ? getDeepestLoadData(currentRoute.firstChild)
    : currentRoute.data;
}

export function injectChildrenLoad<T>(options?: {
  injector?: Injector;
}): Observable<T> {
  const injector = options?.injector ?? inject(Injector);
  const route = injector.get(ActivatedRoute);
  const router = injector.get(Router);

  return router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    startWith(null),
    switchMap(() => getDeepestLoadData(route)),
    map((data) => data['load'] as T),
  );
}
