import type {
  MutationEvent,
  ReconnectEvent,
  WelcomeEvent,
} from '@sanity/client';
import {
  merge,
  ReplaySubject,
  Subject,
  type Observable,
  type ObservedValueOf,
} from 'rxjs';

import type { VisualEditingNode } from '../../types';

type SharedListenEvent = MutationEvent | ReconnectEvent | WelcomeEvent;

/**
 * Creates a single shared listener stream for remote mutations sent through
 * Presentation.
 */
export function createSharedListener(
  comlink: VisualEditingNode,
): Observable<SharedListenEvent> {
  const incomingConnection$ = new ReplaySubject<SharedListenEvent>(1);
  const incomingMutations$ = new Subject<SharedListenEvent>();

  comlink
    .fetch('visual-editing/snapshot-welcome', undefined, {
      suppressWarnings: true,
    })
    .then((data) => {
      incomingConnection$.next(data.event as WelcomeEvent);
    })
    .catch(() => {
      // Optional Presentation capability; unsupported versions fail silently.
    });

  comlink.on('presentation/snapshot-event', (data) => {
    if (data.event.type === 'reconnect') {
      incomingConnection$.next(data.event as ReconnectEvent);
    }
    if (data.event.type === 'mutation') {
      incomingMutations$.next(data.event as MutationEvent);
    }
  });

  return merge(incomingConnection$, incomingMutations$);
}

export type SharedListenerEvents = ObservedValueOf<
  ReturnType<typeof createSharedListener>
>;
