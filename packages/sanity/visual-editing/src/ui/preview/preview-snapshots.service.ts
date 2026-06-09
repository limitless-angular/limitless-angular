import { Injectable, effect, inject, signal } from '@angular/core';

import type { PreviewSnapshot } from '../../types';
import { ComlinkService } from '../comlink.service';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPreviewSnapshotsResponse(
  value: unknown,
): value is { snapshots: PreviewSnapshot[] } {
  return isObject(value) && Array.isArray(value['snapshots']);
}

@Injectable()
export class PreviewSnapshotsService {
  readonly snapshots = signal<PreviewSnapshot[]>([]);

  private comlink = inject(ComlinkService);

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink.node();

      if (!comlink) {
        return;
      }

      const unsubscribe = comlink.on(
        'presentation/preview-snapshots',
        (data) => {
          this.snapshots.set(data.snapshots);
        },
      );

      onCleanup(unsubscribe);
    });

    effect((onCleanup) => {
      const comlink = this.comlink.node();
      const status = this.comlink.status();

      if (!comlink || status !== 'connected') {
        return;
      }

      const controller = new AbortController();

      comlink
        .fetch('visual-editing/preview-snapshots', undefined, {
          signal: controller.signal,
          suppressWarnings: true,
        })
        .then((data) => {
          if (!controller.signal.aborted && isPreviewSnapshotsResponse(data)) {
            this.snapshots.set(data.snapshots);
          }
        })
        .catch(() => {
          // Optional Presentation capability; unsupported versions fail silently.
        });

      onCleanup(() => controller.abort());
    });
  }
}
