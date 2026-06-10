import { Injectable } from '@angular/core';
import type {
  ClientPerspective,
  ContentSourceMapDocuments,
} from '@sanity/client';

import type { ElementState, SanityNode, VisualEditingNode } from '../types';

function isEqualSets(a: Set<string>, b: Set<string>): boolean {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function isReportableSanityNode(
  node: ElementState['sanity'] | undefined,
): node is SanityNode {
  return !!node && 'id' in node;
}

@Injectable()
export class ReportDocumentsService {
  #lastReported?: {
    nodeIds: Set<string>;
    perspective: ClientPerspective;
  };

  getNodeIds(elements: ElementState[]): Set<string> {
    return new Set(
      elements
        .map((element) => element.sanity)
        .filter(isReportableSanityNode)
        .map((node) => node.id),
    );
  }

  report(
    comlink: VisualEditingNode | undefined,
    elements: ElementState[],
    perspective: ClientPerspective,
  ): void {
    if (!comlink) {
      return;
    }

    const nodes = elements
      .map((element) => element.sanity)
      .filter(isReportableSanityNode);
    const nodeIds = new Set(nodes.map((node) => node.id));

    if (
      this.#lastReported &&
      isEqualSets(nodeIds, this.#lastReported.nodeIds) &&
      perspective === this.#lastReported.perspective
    ) {
      return;
    }

    const documents: ContentSourceMapDocuments = Array.from(nodeIds).map(
      (_id) => {
        const node = nodes.find((candidate) => candidate.id === _id);
        if (!node) {
          throw new Error(`Unable to report missing Sanity node "${_id}"`);
        }
        const { dataset: _dataset, projectId: _projectId, type } = node;
        const _type = type as NonNullable<typeof type>;
        return _projectId && _dataset
          ? { _id, _type, _projectId, _dataset }
          : { _id, _type };
      },
    );

    this.#lastReported = { nodeIds, perspective };
    comlink.post('visual-editing/documents', {
      documents,
      perspective,
    });
  }
}
