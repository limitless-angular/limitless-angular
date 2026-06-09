import {
  Injectable,
  type OnDestroy,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

import {
  createSchemaContext,
  getPathsWithUnresolvedTypes,
  haveSameUnresolvedPaths,
} from './schema-context';
import type {
  ElementState,
  ResolvedSchemaTypeMap,
  SchemaType,
  UnresolvedPath,
} from '../../types';
import { ComlinkService } from '../comlink.service';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSchemaResponse(value: unknown): value is { schema: SchemaType[] } {
  return isObject(value) && Array.isArray(value['schema']);
}

@Injectable()
export class SchemaService implements OnDestroy {
  readonly resolvedTypes = signal<ResolvedSchemaTypeMap>(new Map());
  readonly schema = signal<SchemaType[]>([]);
  readonly context = computed(() =>
    createSchemaContext(this.schema(), this.resolvedTypes()),
  );

  private comlink = inject(ComlinkService);
  private reportedUnresolvedPaths: UnresolvedPath[] = [];
  private unresolvedTypesFetch: AbortController | undefined;

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink.node();

      if (!comlink) {
        return;
      }

      const unsubscribe = comlink.on('presentation/schema', (data) => {
        this.schema.set(data.schema);
      });

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
        .fetch('visual-editing/schema', undefined, {
          signal: controller.signal,
          suppressWarnings: true,
        })
        .then((data) => {
          if (!controller.signal.aborted && isSchemaResponse(data)) {
            this.schema.set(data.schema);
          }
        })
        .catch(() => {
          // Optional Presentation capability; unsupported versions fail silently.
        });

      onCleanup(() => controller.abort());
    });
  }

  reportUnresolvedTypes(elements: ElementState[]): void {
    const comlink = this.comlink.node();
    if (!comlink || !this.schema().length) {
      return;
    }

    const paths = getPathsWithUnresolvedTypes(elements);
    if (
      !paths.length ||
      haveSameUnresolvedPaths(this.reportedUnresolvedPaths, paths)
    ) {
      return;
    }

    this.unresolvedTypesFetch?.abort();
    const controller = new AbortController();
    this.unresolvedTypesFetch = controller;

    comlink
      .fetch(
        'visual-editing/schema-union-types',
        { paths },
        { signal: controller.signal, suppressWarnings: true },
      )
      .then((data) => {
        if (controller.signal.aborted) {
          return;
        }

        if (isObject(data) && data['types'] instanceof Map) {
          this.resolvedTypes.set(data['types']);
          this.reportedUnresolvedPaths = paths;
        }
      })
      .catch(() => {
        // Optional Presentation capability; unsupported versions fail silently.
      });
  }

  ngOnDestroy(): void {
    this.unresolvedTypesFetch?.abort();
  }
}
