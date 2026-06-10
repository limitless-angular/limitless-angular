import { computed, inject, type Signal, untracked } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';

import { combineLatest, type Observable, startWith, switchMap } from 'rxjs';
import { map } from 'rxjs/operators';
import { LivePreviewService } from './live-preview.service';
import type { LiveQueryConfig } from './types';

type QueriesConfig<T> = { [K in keyof T]?: LiveQueryConfig };
type LiveDataState<T> = { value: T } | typeof NO_VALUE;

const NO_VALUE = Symbol('NO_VALUE');

// Single query overload
export function createLiveData<T>(
  initialData: () => T,
  queries: () => LiveQueryConfig,
): Signal<T>;

// Multiple queries overload
export function createLiveData<
  T extends Record<string, unknown>,
  K extends keyof T,
>(initialData: () => T, queries: () => QueriesConfig<T>): Signal<Pick<T, K>>;

// Implementation
export function createLiveData<T>(
  initialData: () => T,
  queries: () => LiveQueryConfig | QueriesConfig<T>,
): Signal<T> {
  const livePreviewService = inject(LivePreviewService);
  const config = computed(() => ({
    initial: untracked(initialData),
    queryConfig: queries(),
  }));

  const liveData = toSignal(
    toObservable(config).pipe(
      switchMap(({ initial, queryConfig }) => {
        if ('query' in queryConfig) {
          return livePreviewService
            .listenLiveQuery(
              initial,
              queryConfig.query,
              queryConfig.params,
              queryConfig.perspective ?? null,
            )
            .pipe(startWith(initial));
        }

        const observables = Object.entries(
          queryConfig as QueriesConfig<Record<string, unknown>>,
        ).reduce(
          (acc, [key, config]) => {
            acc[key as keyof T] = livePreviewService.listenLiveQuery(
              initial[key as keyof T],
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              config!.query,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              config!.params,
              // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              config!.perspective ?? null,
            );
            return acc;
          },
          {} as { [K in keyof T]: Observable<T[K]> },
        );

        return combineLatest(observables).pipe(startWith(initial));
      }),
      map((value) => ({ value }) as LiveDataState<T>),
    ),
    { initialValue: NO_VALUE as LiveDataState<T> },
  );

  return computed(() => {
    const state = liveData();
    return state === NO_VALUE ? untracked(initialData) : state.value;
  }) as Signal<T>;
}
