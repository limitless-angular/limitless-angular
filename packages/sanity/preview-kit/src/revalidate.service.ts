import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { isEqual } from 'lodash-es';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  fromEvent,
  timer,
  Subject,
} from 'rxjs';
import {
  distinctUntilChanged,
  filter,
  map,
  shareReplay,
  switchMap,
} from 'rxjs/operators';

export type RevalidateState = 'hit' | 'stale' | 'refresh' | 'inflight';

@Injectable()
export class RevalidateService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private revalidateState$ = new BehaviorSubject<RevalidateState>('hit');
  private online$ = new BehaviorSubject(false);
  private visibilityState$!: Observable<DocumentVisibilityState>;
  private readonly shouldPause$!: Observable<boolean>;
  private refreshInterval$ = new Subject<number>();

  constructor() {
    if (this.isBrowser) {
      this.setupOnlineListener();
      this.visibilityState$ = this.createVisibilityState$();
      this.shouldPause$ = this.createShouldPause$();
      this.setupStateManagement();
    }
  }

  private setupOnlineListener() {
    this.online$.next(navigator.onLine);
    fromEvent(window, 'online')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.online$.next(true));

    fromEvent(window, 'offline')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.online$.next(false));
  }

  private createVisibilityState$(): Observable<DocumentVisibilityState> {
    return new Observable<DocumentVisibilityState>((observer) => {
      const onVisibilityChange = () => observer.next(document.visibilityState);
      document.addEventListener('visibilitychange', onVisibilityChange);
      onVisibilityChange(); // Initial value
      return () =>
        document.removeEventListener('visibilitychange', onVisibilityChange);
    }).pipe(shareReplay(1));
  }

  private createShouldPause$(): Observable<boolean> {
    return combineLatest([this.online$, this.visibilityState$]).pipe(
      map(
        ([online, visibilityState]) => !online || visibilityState === 'hidden',
      ),
      shareReplay(1),
    );
  }

  private setupStateManagement() {
    // Handle window focus
    fromEvent(window, 'focus')
      .pipe(
        filter(() => this.revalidateState$.value === 'hit'),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.revalidateState$.next('stale'));

    // Handle refresh interval
    this.refreshInterval$
      .pipe(
        // If interval is nullish then we don't want to refresh.
        // Inflight means it's already refreshing and we pause the countdown.
        // It's only necessary to start the countdown if the cache isn't already stale
        filter(
          (interval) => !!interval && this.revalidateState$.value === 'hit',
        ),
        switchMap((interval) => timer(0, interval)),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.revalidateState$.next('stale'));

    // Revalidate on changes to shouldPause
    combineLatest([this.shouldPause$, this.revalidateState$])
      .pipe(
        distinctUntilChanged<[boolean, RevalidateState]>(isEqual),
        takeUntilDestroyed(),
      )
      .subscribe(([shouldPause, state]) => {
        // Mark as stale pre-emptively if we're offline or the document isn't visible
        if (shouldPause && state === 'hit') {
          this.revalidateState$.next('stale');
        }

        // If not paused we can mark stale as ready for refresh
        if (!shouldPause && state === 'stale') {
          this.revalidateState$.next('refresh');
        }
      });
  }

  setupRevalidate(refreshInterval: number): void {
    this.refreshInterval$.next(refreshInterval);
  }

  startRefresh(): () => void {
    this.revalidateState$.next('inflight');
    return () => this.revalidateState$.next('hit');
  }

  getRevalidateState(): Observable<RevalidateState> {
    return this.revalidateState$.asObservable().pipe(distinctUntilChanged());
  }
}
