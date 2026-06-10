import type { ClientPerspective } from '@sanity/client';
import { Injectable, computed, signal } from '@angular/core';
import type { Node } from '@sanity/comlink';
import type {
  LoaderControllerMsg,
  LoaderNodeMsg,
} from '@sanity/presentation-comlink';

export type LoaderComlinkNode = Node<LoaderNodeMsg, LoaderControllerMsg>;

@Injectable({ providedIn: 'root' })
export class LoaderComlinkService {
  readonly comlink = signal<LoaderComlinkNode | null>(null);
  readonly projectId = signal<string | null>(null);
  readonly dataset = signal<string | null>(null);
  readonly perspective = signal<ClientPerspective | null>(null);
  readonly hasQueryListeners = computed(() => this.#queryListenerCount() > 0);

  readonly #queryListenerCount = signal(0);

  setComlink(comlink: LoaderComlinkNode | null): void {
    this.comlink.set(comlink);
  }

  setClientConfig(projectId: string | null, dataset: string | null): void {
    this.projectId.set(projectId);
    this.dataset.set(dataset);
  }

  setPerspective(perspective: ClientPerspective | null): void {
    this.perspective.set(perspective);
  }

  addQueryListener(): () => void {
    this.#queryListenerCount.update((count) => count + 1);

    return () => {
      this.#queryListenerCount.update((count) => Math.max(0, count - 1));
    };
  }
}
