import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';

import { createLiveData } from './create-live-data';
import { LivePreviewService } from './live-preview.service';

describe('createLiveData', () => {
  it('starts with initial data, streams updates, and switches queries', () => {
    const initial = signal('first initial');
    const query = signal('first');
    const first = new Subject<string>();
    const second = new Subject<string>();
    const streams = { first, second };
    const service = {
      listenLiveQuery: (_initial: string, key: string) =>
        streams[key as keyof typeof streams],
    };
    TestBed.configureTestingModule({
      providers: [{ provide: LivePreviewService, useValue: service }],
    });

    const liveData = TestBed.runInInjectionContext(() =>
      createLiveData(
        () => initial(),
        () => ({ query: query() }),
      ),
    );

    expect(liveData()).toBe('first initial');
    TestBed.tick();
    first.next('live first');
    expect(liveData()).toBe('live first');

    initial.set('second initial');
    query.set('second');
    TestBed.tick();
    expect(liveData()).toBe('second initial');

    first.next('stale update');
    expect(liveData()).toBe('second initial');
    second.next('live second');
    expect(liveData()).toBe('live second');
  });

  it('combines multiple query streams after each has emitted', () => {
    const post = new Subject<string>();
    const settings = new Subject<string>();
    const streams = { post, settings };
    const service = {
      listenLiveQuery: (_initial: string, key: string) =>
        streams[key as keyof typeof streams],
    };
    TestBed.configureTestingModule({
      providers: [{ provide: LivePreviewService, useValue: service }],
    });

    const liveData = TestBed.runInInjectionContext(() =>
      createLiveData(
        () => ({ post: 'initial post', settings: 'initial settings' }),
        () => ({ post: { query: 'post' }, settings: { query: 'settings' } }),
      ),
    );

    expect(liveData()).toEqual({
      post: 'initial post',
      settings: 'initial settings',
    });
    TestBed.tick();
    post.next('live post');
    expect(liveData().post).toBe('initial post');
    settings.next('live settings');
    expect(liveData()).toEqual({
      post: 'live post',
      settings: 'live settings',
    });
  });
});
