import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, Injectable, PLATFORM_ID, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { createNode, createNodeMachine } from '@sanity/comlink';
import {
  createCompatibilityActors,
  type LoaderControllerMsg,
  type LoaderNodeMsg,
} from '@sanity/presentation-comlink';
import type { ClientPerspective } from '@sanity/client';
import { BehaviorSubject, combineLatest, type Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';

@Injectable()
export class PerspectiveService {
  private destroyRef = inject(DestroyRef);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  private configuredPerspective$ = new BehaviorSubject<
    Exclude<ClientPerspective, 'raw'>
  >('drafts');
  private presentationPerspective$ = new BehaviorSubject<Exclude<
    ClientPerspective,
    'raw'
  > | null>(null);
  private effectivePerspective$ = new BehaviorSubject<
    Exclude<ClientPerspective, 'raw'>
  >('drafts');

  constructor() {
    this.setupPerspectiveUpdates();

    if (!this.isBrowser) {
      return;
    }

    const comlink = createNode<LoaderNodeMsg, LoaderControllerMsg>(
      {
        name: 'loaders',
        connectTo: 'presentation',
      },
      createNodeMachine<LoaderNodeMsg, LoaderControllerMsg>().provide({
        actors: createCompatibilityActors<LoaderNodeMsg>(),
      }),
    );

    comlink.on('loader/perspective', (data) => {
      if (data.perspective !== 'raw') {
        this.presentationPerspective$.next(data.perspective);
      }
    });

    const stop = comlink.start();
    this.destroyRef.onDestroy(() => stop());
  }

  get current(): Exclude<ClientPerspective, 'raw'> {
    return this.effectivePerspective$.value;
  }

  get perspective$(): Observable<Exclude<ClientPerspective, 'raw'>> {
    return this.effectivePerspective$
      .asObservable()
      .pipe(distinctUntilChanged());
  }

  setPerspective(perspective: Exclude<ClientPerspective, 'raw'>): void {
    if (this.configuredPerspective$.value !== perspective) {
      this.configuredPerspective$.next(perspective);
    }
  }

  private setupPerspectiveUpdates(): void {
    combineLatest({
      configuredPerspective: this.configuredPerspective$,
      presentationPerspective: this.presentationPerspective$,
    })
      .pipe(
        map(
          ({ configuredPerspective, presentationPerspective }) =>
            presentationPerspective ?? configuredPerspective,
        ),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((perspective) => {
        this.effectivePerspective$.next(perspective);
      });
  }
}
