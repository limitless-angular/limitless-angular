import { Injectable, inject, DestroyRef, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';

import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import type { ContentSourceMapDocuments } from '@sanity/client/csm';
import {
  createNode,
  createNodeMachine,
  type Message,
  type Node,
} from '@sanity/comlink';

import {
  createCompatibilityActors,
  type PreviewKitNodeMsg,
} from '@limitless-angular/sanity/visual-editing-helpers';

type UseDocumentsInUseConfig = { projectId: string; dataset: string };

@Injectable()
export class UseDocumentsInUseService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyRef = inject(DestroyRef);
  private comlink$ = new BehaviorSubject<Node<
    Message,
    PreviewKitNodeMsg
  > | null>(null);
  private connected$ = new BehaviorSubject(false);
  private documentsInUse$ = new BehaviorSubject<string>('[]');
  private documentsInUse = new Map<string, ContentSourceMapDocuments[number]>();

  initialize(config: UseDocumentsInUseConfig): this {
    if (this.isBrowser) {
      this.setupChannelIfNeeded();
      this.setupDocumentSync(config);
    }

    return this;
  }

  private setupChannelIfNeeded() {
    if (window.self !== window.top || window.opener) {
      const comlink = createNode<Message, PreviewKitNodeMsg>(
        {
          name: 'preview-kit',
          connectTo: 'presentation',
        },
        createNodeMachine<Message, PreviewKitNodeMsg>().provide({
          actors: createCompatibilityActors<PreviewKitNodeMsg>(),
        }),
      );

      comlink.onStatus((status) =>
        this.connected$.next(status === 'connected'),
      );

      const timeout = setTimeout(() => this.comlink$.next(comlink), 0);
      const stop = comlink.start();

      this.destroyRef.onDestroy(() => {
        stop();
        this.comlink$.next(null);
        clearTimeout(timeout);
      });
    }
  }

  private setupDocumentSync({ projectId, dataset }: UseDocumentsInUseConfig) {
    combineLatest([this.comlink$, this.connected$, this.documentsInUse$])
      .pipe(
        filter(
          ([comlink, connected, changedKeys]) =>
            !!comlink && connected && changedKeys !== '[]',
        ),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([comlink]) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        comlink!.post({
          type: 'preview-kit/documents',
          data: {
            projectId,
            dataset,
            perspective: 'previewDrafts',
            documents: Array.from(this.documentsInUse.values()),
          },
        });
      });
  }

  updateDocumentsInUse(
    documentsInUse: Map<string, ContentSourceMapDocuments[number]>,
  ): void {
    this.documentsInUse = documentsInUse;
    const changedKeys = JSON.stringify(Array.from(documentsInUse.keys()));
    this.documentsInUse$.next(changedKeys);
  }
}
