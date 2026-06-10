import { Injectable, type OnDestroy, effect, signal } from '@angular/core';
import { createNode, createNodeMachine, type Status } from '@sanity/comlink';
import {
  createCompatibilityActors,
  type VisualEditingControllerMsg,
  type VisualEditingNodeMsg,
} from '@sanity/presentation-comlink';

import type { VisualEditingNode } from '../types';

type Unsubscribe = () => void;

@Injectable()
export class ComlinkService implements OnDestroy {
  readonly node = signal<VisualEditingNode | undefined>(undefined);
  readonly status = signal<Status>('idle');

  #cleanup: Unsubscribe[] = [];

  constructor() {
    effect((onCleanup) => {
      if (this.status() === 'connected') {
        return;
      }

      const controller = new AbortController();
      window.addEventListener(
        'message',
        ({ data, origin }: MessageEvent<unknown>) => {
          if (
            data &&
            typeof data === 'object' &&
            'domain' in data &&
            data.domain === 'sanity/channels' &&
            'from' in data &&
            data.from === 'presentation' &&
            'type' in data &&
            data.type === 'presentation/status'
          ) {
            window.parent.postMessage(
              {
                domain: 'sanity/channels',
                type: 'visual-editing/status',
                data: { origin: location.origin },
              },
              origin,
            );
          }
        },
        { signal: controller.signal },
      );

      onCleanup(() => controller.abort());
    });
  }

  start(enabled: boolean): void {
    if (!enabled || this.node()) {
      return;
    }

    const node = createNode<VisualEditingNodeMsg, VisualEditingControllerMsg>(
      {
        name: 'visual-editing',
        connectTo: 'presentation',
      },
      createNodeMachine<
        VisualEditingNodeMsg,
        VisualEditingControllerMsg
      >().provide({
        actors: createCompatibilityActors<VisualEditingNodeMsg>(),
      }),
    );

    this.node.set(node);
    this.status.set('idle');

    const unsubscribeConnected = node.onStatus(() => {
      this.status.set('connected');
    }, 'connected');
    const stop = node.start();

    this.#cleanup.push(() => {
      unsubscribeConnected();
      stop();
      this.node.set(undefined);
      this.status.set('idle');
    });
  }

  stop(): void {
    for (const cleanup of this.#cleanup.splice(0)) {
      cleanup();
    }
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
