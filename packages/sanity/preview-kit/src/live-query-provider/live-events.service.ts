import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import type { LiveEvent, LiveEventMessage, SanityClient } from '@sanity/client';
import { BehaviorSubject, Subject } from 'rxjs';

import { DEFAULT_TAG } from './constants';

export interface LiveEventsState {
  /**
   * Growing list of live events with Sync Tags that can be used with
   * `lastLiveEventId` when refetching queries.
   */
  messages: LiveEventMessage[];
  /**
   * Incremented when the live connection reconnects or restarts.
   */
  resets: number;
}

export const initialLiveEventsState: LiveEventsState = {
  messages: [],
  resets: 0,
};

export function reduceLiveEvent(
  state: LiveEventsState,
  event: LiveEvent,
): LiveEventsState {
  switch (event.type) {
    case 'message':
      return {
        ...state,
        messages: [...state.messages, event],
      };
    case 'reconnect':
    case 'restart':
      return {
        ...state,
        messages: [],
        resets: state.resets + 1,
      };
    case 'welcome':
      return state;
    default:
      throw Error(`Unknown event: ${(event as { type: string }).type}`, {
        cause: event,
      });
  }
}

@Injectable()
export class LiveEventsService {
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private stateSubject = new BehaviorSubject(initialLiveEventsState);
  private errorSubject = new Subject<unknown>();
  private isInitialized = false;

  readonly state$ = this.stateSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();

  get snapshot(): LiveEventsState {
    return this.stateSubject.value;
  }

  initialize(client: SanityClient): void {
    if (!this.isBrowser || this.isInitialized) {
      return;
    }

    const events$ = client.live.events({
      includeDrafts: true,
      tag: DEFAULT_TAG,
    });

    this.isInitialized = true;
    events$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (event) => {
        this.stateSubject.next(reduceLiveEvent(this.stateSubject.value, event));
      },
      error: (error) => {
        this.errorSubject.next(
          error instanceof Error
            ? error
            : new Error('Unexpected error in LiveEventsService', {
                cause: error,
              }),
        );
      },
    });
  }
}
