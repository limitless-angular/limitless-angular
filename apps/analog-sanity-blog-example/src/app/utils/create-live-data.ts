import {
  computed,
  effect,
  inject,
  signal,
  type Signal,
  untracked,
} from '@angular/core';

import { combineLatest, type Observable, startWith } from 'rxjs';
import { LivePreviewService } from '@limitless-angular/sanity/preview-kit';

type QueryConfig = { query: string; params?: Record<string, unknown> };

type QueriesConfig<T> = { [K in keyof T]?: QueryConfig };

export function createLiveData<
  T extends Record<string, unknown>,
  K extends keyof T,
>(initialData: () => T, queries: () => QueriesConfig<T>): Signal<Pick<T, K>> {
  const livePreviewService = inject(LivePreviewService);
  return computedAsync(() => {
    const queryData = queries();
    const initial = untracked(initialData);
    const observables = Object.entries(queryData).reduce(
      (acc, [key, config]) => {
        acc[key as keyof T] = livePreviewService.listenLiveQuery(
          initial[key as keyof T],
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          config!.query,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          config!.params,
        );
        return acc;
      },
      {} as { [K in keyof T]: Observable<T[K]> },
    );

    return combineLatest(observables).pipe(startWith(initial));
  }, initialData) as Signal<Pick<T, K>>;
}

function computedAsync<T>(
  computation: () => Observable<T>,
  initialValue: () => T,
): Signal<T | undefined> {
  const value = signal<T | undefined>(undefined);
  const error = signal<unknown | undefined>(undefined);

  effect(
    (onCleanup) => {
      const subscription = computation().subscribe({
        next: (v) => value.set(v),
        error: (e) => error.set(e),
      });

      onCleanup(() => subscription.unsubscribe());
    },
    { allowSignalWrites: true },
  );

  return computed(() => {
    if (error()) {
      throw error();
    }

    return value() ?? untracked(initialValue);
  });
}
