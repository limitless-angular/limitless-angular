import { Injectable, inject } from '@angular/core';
import type {
  DocumentsGet,
  DocumentsMutate,
  MutatorActor,
} from '@sanity/visual-editing/optimistic';
import {
  isMaybePreviewIframe,
  isMaybePreviewWindow,
} from '@sanity/presentation-comlink';

import {
  createDocumentsGet,
  createDocumentsMutate,
} from '../optimistic/documents';
import { DatasetMutatorService } from './dataset-mutator.service';

@Injectable()
export class DocumentsService {
  private datasetMutator = inject(DatasetMutatorService);

  readonly getDocument: DocumentsGet = <T extends Record<string, unknown>>(
    documentId: string,
  ) => createDocumentsGet(this.requireActor())<T>(documentId);

  readonly mutateDocument: DocumentsMutate = (documentId, mutations, options) =>
    createDocumentsMutate(this.requireActor())(documentId, mutations, options);

  private requireActor(): MutatorActor {
    const actor = this.datasetMutator.actor();
    const inFrame = isMaybePreviewIframe();
    const inPopUp = isMaybePreviewWindow();

    if (!actor || (!inFrame && !inPopUp)) {
      throw new Error(
        'The `injectDocuments` helper cannot be used in this context.',
      );
    }

    return actor;
  }
}

export function injectDocuments(): DocumentsService {
  return inject(DocumentsService);
}
