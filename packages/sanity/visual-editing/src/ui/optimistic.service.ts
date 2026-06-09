import {
  Injectable,
  Injector,
  computed,
  effect,
  inject,
  signal,
  type Signal,
} from '@angular/core';
import type { SanityDocument } from '@sanity/client';
import { getPublishedId } from '@sanity/client/csm';
import type {
  OptimisticReducer,
  OptimisticReducerAction,
} from '@sanity/visual-editing/optimistic';

import { DatasetMutatorService } from './dataset-mutator.service';

@Injectable()
export class OptimisticService {
  private datasetMutator = inject(DatasetMutatorService);
  private injector = inject(Injector);

  optimistic<T, U = SanityDocument>(
    passthrough: Signal<T>,
    reducer: OptimisticReducer<T, U> | Array<OptimisticReducer<T, U>>,
    options: { injector?: Injector } = {},
  ): Signal<T> {
    const injector = options.injector ?? this.injector;
    const pristine = signal(true);
    const optimistic = signal<T>(passthrough());
    const lastEvent = signal<OptimisticReducerAction<U> | null>(null);
    const lastPassthrough = signal<T>(passthrough());

    const reduceStateFromAction = (
      action: OptimisticReducerAction<U>,
      prevState: T,
    ): T => {
      const reducers = Array.isArray(reducer) ? reducer : [reducer];
      return reducers.reduce(
        (acc, reducer) =>
          reducer(acc, {
            document: action.document,
            id: getPublishedId(action.id),
            originalId: action.id,
            type: action.type,
          }),
        prevState,
      );
    };

    effect(
      (onCleanup) => {
        const actor = this.datasetMutator.actor();

        if (!actor) {
          return;
        }

        let pristineTimeout: ReturnType<typeof setTimeout> | undefined;

        const rebasedSub = actor.on('rebased.local', (_event) => {
          const event = {
            document: _event.document as U,
            id: _event.id,
            originalId: getPublishedId(_event.id),
            type: 'mutate' as const,
          };

          optimistic.update((prevState) =>
            reduceStateFromAction(event, prevState),
          );
          lastEvent.set(event);
          lastPassthrough.set(passthrough());
          pristine.set(false);

          if (pristineTimeout) {
            clearTimeout(pristineTimeout);
          }
        });

        const pristineSub = actor.on('pristine', () => {
          pristineTimeout = setTimeout(() => {
            pristine.set(true);
          }, 15000);
        });

        onCleanup(() => {
          rebasedSub.unsubscribe();
          pristineSub.unsubscribe();

          if (pristineTimeout) {
            clearTimeout(pristineTimeout);
          }
        });
      },
      { injector },
    );

    effect(
      () => {
        if (pristine()) {
          return;
        }

        const event = lastEvent();

        if (!event) {
          throw new Error('No last event found when syncing passthrough');
        }

        const currentPassthrough = passthrough();

        if (lastPassthrough() === currentPassthrough) {
          return;
        }

        optimistic.set(reduceStateFromAction(event, currentPassthrough));
        lastPassthrough.set(currentPassthrough);
      },
      { injector },
    );

    return computed(() => (pristine() ? passthrough() : optimistic()));
  }
}

export function injectOptimistic<T, U = SanityDocument>(
  passthrough: Signal<T>,
  reducer: OptimisticReducer<T, U> | Array<OptimisticReducer<T, U>>,
): Signal<T> {
  const injector = inject(Injector);
  return inject(OptimisticService).optimistic(passthrough, reducer, {
    injector,
  });
}
