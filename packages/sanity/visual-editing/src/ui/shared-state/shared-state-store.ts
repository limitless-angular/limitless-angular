import {
  computed,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';

export type SharedState = Record<string, unknown>;

export interface SharedStateStore {
  readonly state: WritableSignal<SharedState>;
  remove: (key: string) => void;
  select: <T = unknown>(key: string) => Signal<T | undefined>;
  set: (state: SharedState) => void;
  setValue: (key: string, value: unknown) => void;
}

export function createSharedStateStore(
  initialState: SharedState = {},
): SharedStateStore {
  const state = signal<SharedState>(initialState);

  return {
    state,
    remove: (key) => {
      state.update((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([entryKey]) => entryKey !== key),
        ),
      );
    },
    select: <T = unknown>(key: string) =>
      computed(() => state()[key] as T | undefined),
    set: (nextState) => state.set(nextState),
    setValue: (key, value) => {
      state.update((current) => ({
        ...current,
        [key]: value,
      }));
    },
  };
}
