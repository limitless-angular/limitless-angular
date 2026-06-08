/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  createSharedListener,
  documentMutatorMachine,
  type DocumentMutatorMachineParentEvent,
} from '@sanity/mutate/_unstable_machine';
import {
  assertEvent,
  assign,
  emit,
  setup,
  stopChild,
  type AnyActorLogic,
} from 'xstate';

import type { VisualEditingNode } from '../../types';
import { createDocumentMutator } from './document-mutator';

export interface DatasetMutatorMachineInput {
  client: any;
  /**
   * A shared listener can be provided; otherwise `client.listen()` is used.
   */
  sharedListener?: any;
}

const datasetMutatorMachine = setup({
  types: {} as {
    context: {
      client: any;
      sharedListener?: any;
      documents: Record<string, any>;
    };
    events:
      | { type: 'observe'; documentId: string }
      | { type: 'unobserve'; documentId: string }
      | { type: 'add document actor'; documentId: string }
      | { type: 'stop document actor'; documentId: string }
      | DocumentMutatorMachineParentEvent;
    input: DatasetMutatorMachineInput;
    emitted: DocumentMutatorMachineParentEvent;
  },
  actions: {
    'emit sync event': emit(({ event }) => {
      assertEvent(event, 'sync');
      return event;
    }),
    'emit mutation event': emit(({ event }) => {
      assertEvent(event, 'mutation');
      return event;
    }),
    'emit rebased event': emit(({ event }) => {
      assertEvent(event, ['rebased.local', 'rebased.remote']);
      return event;
    }),
    'emit pristine event': emit(({ event }) => {
      assertEvent(event, ['pristine']);
      return event;
    }),
    'add document actor': assign({
      documents: ({ context, event, spawn }) => {
        assertEvent(event, 'observe');
        const id = event.documentId;

        if (context.documents[id]) {
          return context.documents;
        }

        return {
          ...context.documents,
          [id]: spawn('documentMutatorMachine', {
            input: {
              id,
              client: context.client,
              sharedListener:
                context.sharedListener ?? createSharedListener(context.client),
            },
            id,
          }),
        };
      },
    }),
    'stop remote snapshot': stopChild(({ context, event }) => {
      assertEvent(event, 'unobserve');
      return context.documents[event.documentId];
    }),
    'remove remote snapshot from context': assign({
      documents: ({ context, event }) => {
        assertEvent(event, 'unobserve');

        if (!context.documents[event.documentId]) {
          return context.documents;
        }

        const { [event.documentId]: _, ...documents } = context.documents;
        return documents;
      },
    }),
  },
  actors: {
    documentMutatorMachine,
  },
}).createMachine({
  id: 'dataset-mutator',
  context: ({ input }) => ({
    documents: {},
    client: input.client,
    sharedListener: input.sharedListener,
  }),

  on: {
    sync: { actions: ['emit sync event'] },
    mutation: { actions: ['emit mutation event'] },
    'rebased.*': { actions: ['emit rebased event'] },
    pristine: { actions: ['emit pristine event'] },
    observe: {
      actions: ['add document actor'],
    },
    unobserve: {
      actions: ['stop remote snapshot', 'remove remote snapshot from context'],
    },
  },

  initial: 'pristine',

  states: {
    pristine: {},
  },
});

export const createDatasetMutator = (
  comlink: VisualEditingNode,
): AnyActorLogic => {
  return datasetMutatorMachine.provide({
    actors: {
      documentMutatorMachine: createDocumentMutator(comlink) as any,
    },
  }) as unknown as AnyActorLogic;
};
