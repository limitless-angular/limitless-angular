import { Injectable, type OnDestroy, signal } from '@angular/core';
import type { SanityClient } from '@sanity/client';
import {
  createDatasetMutator,
  setActor,
  type MutatorActor,
} from '@sanity/visual-editing/optimistic';
import { createActor } from 'xstate';

import type { VisualEditingNode } from '../types';
import { createSharedListener } from '../optimistic/state/create-shared-listener';

@Injectable()
export class DatasetMutatorService implements OnDestroy {
  readonly actor = signal<MutatorActor | undefined>(undefined);
  readonly optimisticActorReady = signal(false);

  #startingComlink: VisualEditingNode | undefined;
  #connectedComlink: VisualEditingNode | undefined;
  #mutatorComlink: VisualEditingNode | undefined;
  #exposedComlink: VisualEditingNode | undefined;
  #mutator:
    | (MutatorActor & { start: () => void; stop: () => void })
    | undefined;
  #featuresFetch: AbortController | undefined;
  #optimisticFeatureAvailable = false;

  connect(comlink: VisualEditingNode | undefined): void {
    if (this.#connectedComlink === comlink) {
      return;
    }

    this.disconnect();
    this.#connectedComlink = comlink;

    if (!comlink) {
      return;
    }

    this.start(comlink);

    const featuresFetch = new AbortController();
    this.#featuresFetch = featuresFetch;

    comlink
      .fetch('visual-editing/features', undefined, {
        signal: featuresFetch.signal,
        suppressWarnings: true,
      })
      .then((data) => {
        if (
          featuresFetch.signal.aborted ||
          this.#connectedComlink !== comlink
        ) {
          return;
        }

        this.#optimisticFeatureAvailable = data.features['optimistic'] === true;
        if (this.#optimisticFeatureAvailable) {
          this.exposeActor(comlink);
        }
      })
      .catch(() => {
        if (featuresFetch.signal.aborted) {
          return;
        }

        console.warn(
          '[@limitless-angular/sanity] Package version mismatch detected: Please update your Sanity studio to prevent potential compatibility issues.',
        );
      });
  }

  disconnect(): void {
    this.#featuresFetch?.abort();
    this.#featuresFetch = undefined;
    this.#connectedComlink = undefined;
    this.#startingComlink = undefined;
    this.#optimisticFeatureAvailable = false;
    this.optimisticActorReady.set(false);
    this.stop();
  }

  private start(comlink: VisualEditingNode): void {
    if (
      this.#mutatorComlink === comlink ||
      this.#connectedComlink !== comlink ||
      this.#startingComlink === comlink
    ) {
      return;
    }

    this.#startingComlink = comlink;

    try {
      if (
        this.#connectedComlink !== comlink ||
        this.#startingComlink !== comlink
      ) {
        return;
      }

      this.stop();

      const datasetMutator = createDatasetMutator(comlink);
      const sharedListener = createSharedListener(comlink);
      const actor = createActor(datasetMutator, {
        input: {
          client: {
            withConfig: () => ({}),
          } as unknown as SanityClient,
          sharedListener,
        },
      }) as unknown as MutatorActor & { start: () => void };

      actor.start();
      this.#mutator = actor as MutatorActor & {
        start: () => void;
        stop: () => void;
      };
      this.#mutatorComlink = comlink;
      this.exposeActor(comlink);
    } catch (error) {
      console.warn(
        '[@limitless-angular/sanity] Failed to start visual editing optimistic mutations.',
        error,
      );
    } finally {
      if (this.#startingComlink === comlink) {
        this.#startingComlink = undefined;
      }
    }
  }

  private exposeActor(comlink: VisualEditingNode): void {
    if (
      this.#connectedComlink !== comlink ||
      this.#mutatorComlink !== comlink ||
      !this.#optimisticFeatureAvailable ||
      !this.#mutator ||
      this.#exposedComlink === comlink
    ) {
      return;
    }

    setActor(this.#mutator);
    this.actor.set(this.#mutator);
    this.#exposedComlink = comlink;
    this.optimisticActorReady.set(true);
  }

  private stop(): void {
    this.#mutator?.stop();
    this.#mutator = undefined;
    this.actor.set(undefined);
    this.#mutatorComlink = undefined;
    this.#exposedComlink = undefined;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
