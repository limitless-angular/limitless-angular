import type { ListenEvent } from '@sanity/client';
import {
  merge,
  ReplaySubject,
  Subject,
  type Observable,
  type ObservedValueOf,
} from 'rxjs';

import type { VisualEditingNode } from '../../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SharedListenEvent = ListenEvent<Record<string, any>>;

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
      incomingConnection$.next(data.event);
    })
    .catch(() => {
      // Optional Presentation capability; unsupported versions fail silently.
    });

  comlink.on('presentation/snapshot-event', (data) => {
    if (data.event.type === 'reconnect') {
      incomingConnection$.next(data.event);
    }
    if (data.event.type === 'mutation') {
      incomingMutations$.next(data.event);
    }
  });

  return merge(incomingConnection$, incomingMutations$);
}

export type SharedListenerEvents = ObservedValueOf<
  ReturnType<typeof createSharedListener>
>;
