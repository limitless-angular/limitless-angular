import type { LiveEvent } from '@sanity/client';

import { initialLiveEventsState, reduceLiveEvent } from './live-events.service';

describe('reduceLiveEvent', () => {
  it('appends message events', () => {
    const event: LiveEvent = {
      type: 'message',
      id: 'event-1',
      tags: ['s1:post'],
    };

    expect(reduceLiveEvent(initialLiveEventsState, event)).toEqual({
      messages: [event],
      resets: 0,
    });
  });

  it('clears messages and increments resets on reconnects and restarts', () => {
    const state = {
      messages: [{ type: 'message', id: 'event-1', tags: ['s1:post'] }],
      resets: 0,
    } satisfies typeof initialLiveEventsState;

    expect(reduceLiveEvent(state, { type: 'reconnect' })).toEqual({
      messages: [],
      resets: 1,
    });
    expect(reduceLiveEvent(state, { type: 'restart', id: 'event-2' })).toEqual({
      messages: [],
      resets: 1,
    });
  });

  it('keeps state unchanged on welcome', () => {
    expect(reduceLiveEvent(initialLiveEventsState, { type: 'welcome' })).toBe(
      initialLiveEventsState,
    );
  });
});
