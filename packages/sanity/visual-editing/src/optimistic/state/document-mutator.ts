/* eslint-disable @typescript-eslint/no-explicit-any */
import { SanityEncoder, type Transaction } from '@sanity/mutate';
import {
  documentMutatorMachine,
  type DocumentMutatorMachineParentEvent,
} from '@sanity/mutate/_unstable_machine';
import { enqueueActions, fromPromise, type AnyActorLogic } from 'xstate';

import type { VisualEditingNode } from '../../types';

export const createDocumentMutator = (
  comlink: VisualEditingNode,
): AnyActorLogic => {
  const fetchSnapshot = fromPromise(
    async ({
      input,
      signal,
    }: {
      input: { id: string; client: any };
      signal: AbortSignal;
    }) => {
      const { id } = input;
      const { snapshot } = await comlink.fetch(
        'visual-editing/fetch-snapshot',
        { documentId: id },
        {
          signal,
        },
      );
      return snapshot;
    },
  );

  const submitMutations = fromPromise(
    async ({
      input,
    }: {
      input: { client: any; transactions: Transaction[] };
    }) => {
      const { transactions } = input;

      for (const transaction of transactions) {
        const data = SanityEncoder.encodeTransaction(transaction);
        return comlink.post('visual-editing/mutate', data);
      }
    },
  );

  return documentMutatorMachine.provide({
    actions: {
      'send sync event to parent': enqueueActions(({ enqueue }) => {
        enqueue.sendParent(
          ({ context }) =>
            ({
              type: 'sync',
              id: context.id,
              document: context.remote as any,
            }) satisfies DocumentMutatorMachineParentEvent,
        );
        enqueue.emit(({ context }) => ({
          type: 'ready',
          snapshot: context.local,
        }));
      }),
    },
    actors: {
      'fetch remote snapshot': fetchSnapshot,
      'submit mutations as transactions': submitMutations,
    },
  }) as unknown as AnyActorLogic;
};
