import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import type { ClientPerspective } from '@sanity/client';
import { getDraftId, getPublishedId } from '@sanity/client/csm';

import { DatasetMutatorService } from './dataset-mutator.service';

function haveSameDocumentIds(
  previous: readonly string[],
  next: readonly string[],
): boolean {
  if (previous === next) {
    return true;
  }
  if (previous.length !== next.length) {
    return false;
  }

  return previous.every((id) => next.includes(id));
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-document-reporter',
  standalone: true,
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DocumentReporterComponent {
  documentIds = input.required<readonly string[]>();
  perspective = input.required<ClientPerspective>();

  private datasetMutator = inject(DatasetMutatorService);
  private currentDocumentIds: readonly string[] = [];
  private uniqueDocumentIds = signal<readonly string[]>([]);

  constructor() {
    effect(() => {
      const next = Array.from(new Set(this.documentIds()));
      if (haveSameDocumentIds(this.currentDocumentIds, next)) {
        return;
      }

      this.currentDocumentIds = next;
      this.uniqueDocumentIds.set(next);
    });

    effect((onCleanup) => {
      const actor = this.datasetMutator.actor();
      const documentIds = this.uniqueDocumentIds();

      if (!actor) {
        return;
      }

      for (const id of documentIds) {
        actor.send({ type: 'observe', documentId: getDraftId(id) });
        actor.send({ type: 'observe', documentId: getPublishedId(id) });
      }

      onCleanup(() => {
        if (this.datasetMutator.actor() !== actor) {
          return;
        }

        for (const id of documentIds) {
          actor.send({ type: 'unobserve', documentId: getDraftId(id) });
          actor.send({ type: 'unobserve', documentId: getPublishedId(id) });
        }
      });
    });
  }
}
