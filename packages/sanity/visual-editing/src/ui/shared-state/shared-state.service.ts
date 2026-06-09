import { Injectable, type Signal, effect, inject } from '@angular/core';

import { ComlinkService } from '../comlink.service';
import { createSharedStateStore } from './shared-state-store';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSharedStateResponse(
  value: unknown,
): value is { state: Record<string, unknown> } {
  return isObject(value) && isObject(value['state']);
}

@Injectable()
export class SharedStateService {
  private store = createSharedStateStore();

  readonly state = this.store.state;

  private comlink = inject(ComlinkService);

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink.node();

      if (!comlink) {
        return;
      }

      const unsubscribe = comlink.on('presentation/shared-state', (data) => {
        if ('value' in data) {
          this.store.setValue(data.key, data.value);
          return;
        }

        this.store.remove(data.key);
      });

      onCleanup(unsubscribe);
    });

    effect((onCleanup) => {
      const comlink = this.comlink.node();

      if (!comlink) {
        return;
      }

      let active = true;

      comlink
        .fetch('visual-editing/shared-state', undefined, {
          suppressWarnings: true,
        })
        .then((data) => {
          if (active && isSharedStateResponse(data)) {
            this.store.set(data.state);
          }
        })
        .catch(() => {
          // Optional Presentation capability; unsupported versions fail silently.
        });

      onCleanup(() => {
        active = false;
      });
    });
  }

  select<T = unknown>(key: string): Signal<T | undefined> {
    return this.store.select<T>(key);
  }
}

export function injectSharedState<T = unknown>(
  key: string,
): Signal<T | undefined> {
  return inject(SharedStateService).select<T>(key);
}
