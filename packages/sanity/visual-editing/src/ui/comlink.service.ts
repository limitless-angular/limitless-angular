import { Injectable, type OnDestroy, signal } from '@angular/core';
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
