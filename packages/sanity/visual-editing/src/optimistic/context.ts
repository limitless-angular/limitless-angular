import { createEmptyActor } from 'xstate';

export type MutatorActor = {
  getSnapshot: () => {
    context?: {
      documents?: Record<string, DocumentMutatorActor>;
    };
  };
  send: (event: { type: string; documentId?: string }) => void;
  stop: () => void;
};

export type DocumentMutatorActor = {
  getSnapshot: () => {
    context?: {
      local?: unknown;
    };
  };
  on: (
    event: string,
    handler: (event: unknown) => void,
  ) => {
    unsubscribe: () => void;
  };
  send: (event: { type: string; mutations?: unknown[] }) => void;
};
export type EmptyActor = typeof emptyActor;

export const emptyActor = createEmptyActor();

export let actor: MutatorActor | EmptyActor = emptyActor;

export const listeners = new Set<() => void>();

export function isEmptyActor(
  actorRef: MutatorActor | EmptyActor,
): actorRef is EmptyActor {
  return actorRef === emptyActor;
}

export function setActor(nextActor: MutatorActor): void {
  actor = nextActor;
  for (const onActorChange of listeners) {
    onActorChange();
  }
}
