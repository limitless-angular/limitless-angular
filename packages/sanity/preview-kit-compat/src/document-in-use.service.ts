import { Injectable, inject, DestroyRef, PLATFORM_ID } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { isPlatformBrowser } from '@angular/common';

import { BehaviorSubject, combineLatest } from 'rxjs';
import { distinctUntilChanged, filter } from 'rxjs/operators';
import type { ContentSourceMapDocuments } from '@sanity/client/csm';

import { type ChannelsNode, createChannelsNode } from '@repo/channels';
import type {
  PresentationMsg,
  PreviewKitMsg,
  VisualEditingConnectionIds,
} from '@repo/visual-editing-helpers';

type UseDocumentsInUseConfig = { projectId: string; dataset: string };

@Injectable()
export class UseDocumentsInUseService {
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private destroyRef = inject(DestroyRef);
  private channel$ = new BehaviorSubject<
    ChannelsNode<PreviewKitMsg, PresentationMsg> | undefined
  >(undefined);
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
      const channel = createChannelsNode<
        VisualEditingConnectionIds,
        PreviewKitMsg,
        PresentationMsg
      >({
        id: 'preview-kit',
        connectTo: 'presentation',
      });

      channel.onStatusUpdate((status) =>
        this.connected$.next(status === 'connected'),
      );

      setTimeout(() => this.channel$.next(channel), 0);

      this.destroyRef.onDestroy(() => {
        channel.destroy();
        this.channel$.next(undefined);
      });
    }
  }

  private setupDocumentSync({ projectId, dataset }: UseDocumentsInUseConfig) {
    combineLatest([this.channel$, this.connected$, this.documentsInUse$])
      .pipe(
        filter(
          ([channel, connected, changedKeys]) =>
            !!channel && connected && changedKeys !== '[]',
        ),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([channel]) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        channel!.send('preview-kit/documents', {
          projectId,
          dataset,
          perspective: 'previewDrafts',
          documents: Array.from(this.documentsInUse.values()),
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
