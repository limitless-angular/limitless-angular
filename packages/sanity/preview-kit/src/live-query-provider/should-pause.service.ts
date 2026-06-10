import { isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BehaviorSubject,
  Observable,
  combineLatest,
  fromEvent,
  of,
} from 'rxjs';
import { distinctUntilChanged, map, shareReplay } from 'rxjs/operators';

@Injectable()
export class ShouldPauseService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private online$ = new BehaviorSubject(false);

  readonly shouldPause$ = this.isBrowser ? this.createShouldPause$() : of(true);

  constructor() {
    if (!this.isBrowser) {
      return;
    }

    this.online$.next(navigator.onLine);
    fromEvent(window, 'online')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.online$.next(true));

    fromEvent(window, 'offline')
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.online$.next(false));
  }

  private createShouldPause$(): Observable<boolean> {
    return combineLatest([this.online$, this.createVisibilityState$()]).pipe(
      map(
        ([online, visibilityState]) => !online || visibilityState === 'hidden',
      ),
      distinctUntilChanged(),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  private createVisibilityState$(): Observable<DocumentVisibilityState> {
    return new Observable<DocumentVisibilityState>((observer) => {
      const onVisibilityChange = () => observer.next(document.visibilityState);

      document.addEventListener('visibilitychange', onVisibilityChange);
      onVisibilityChange();

      return () => {
        document.removeEventListener('visibilitychange', onVisibilityChange);
      };
    }).pipe(shareReplay({ bufferSize: 1, refCount: true }));
  }
}
