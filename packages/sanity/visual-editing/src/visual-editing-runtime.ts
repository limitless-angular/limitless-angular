import {
  createComponent,
  type ComponentRef,
  type Type,
  type ViewRef,
} from '@angular/core';
import type {
  ClientPerspective,
  ContentSourceMapDocuments,
  SanityClient,
} from '@sanity/client';
import {
  createEditUrl,
  getDraftId,
  getPublishedId,
  studioPath,
} from '@sanity/client/csm';
import { createNode, createNodeMachine, type Status } from '@sanity/comlink';
import {
  createCompatibilityActors,
  isMaybePreviewIframe,
  isMaybePreviewWindow,
  type VisualEditingControllerMsg,
  type VisualEditingNodeMsg,
} from '@sanity/presentation-comlink';
import { pathToUrlString } from '@sanity/visual-editing-csm';

import { createOverlayController } from './controller';
import {
  createInitialOverlayState,
  overlayStateReducer,
} from './overlay-state-reducer';
import type { MutatorActor } from './optimistic/context';
import { VisualEditingPointerEventsComponent } from './pointer-events.component';
import {
  createSchemaContext,
  getPathsWithUnresolvedTypes,
  haveSameUnresolvedPaths,
} from './schema-context';
import type {
  AngularOverlayComponent,
  AngularOverlayComponentDefinition,
  DisableVisualEditing,
  ElementState,
  OverlayComponentResolverContext,
  OverlayEventHandler,
  OverlayMsg,
  OverlayState,
  PreviewSnapshot,
  ResolvedSchemaTypeMap,
  SanityNode,
  SchemaType,
  UnresolvedPath,
  VisualEditingNode,
  VisualEditingOptions,
} from './types';
import { getLinkHref } from './util/get-link-href';

const ROOT_TAG = 'sanity-visual-editing';
const DEFAULT_Z_INDEX = '9999999';
const DRAG_INSERT_MARKER_THICKNESS = 6;

type Unsubscribe = () => void;

const telemetryEvents = {
  'Visual Editing Overlay Clicked': {
    name: 'Visual Editing Overlay Clicked',
    description: 'An Overlay is clicked.',
    version: 1,
  },
  'Visual Editing Drag Sequence Completed': {
    name: 'Visual Editing Drag Sequence Completed',
    description: 'A user completed dragging an element.',
    version: 1,
  },
  'Visual Editing Drag Minimap Enabled': {
    name: 'Visual Editing Drag Minimap Enabled',
    description: 'A user opened the drag minimap.',
    version: 1,
  },
  'Visual Editing Context Menu Item Removed': {
    name: 'Visual Editing Context Menu Item Removed',
    description: 'An item is removed using the Context Menu.',
    version: 1,
  },
  'Visual Editing Context Menu Item Duplicated': {
    name: 'Visual Editing Context Menu Item Duplicated',
    description: 'An item is duplicated using the Context Menu.',
    version: 1,
  },
  'Visual Editing Context Menu Item Moved': {
    name: 'Visual Editing Context Menu Item Moved',
    description: 'An item is moved using the Context Menu.',
    version: 1,
  },
  'Visual Editing Context Menu Item Inserted': {
    name: 'Visual Editing Context Menu Item Inserted',
    description: 'An item is inserted using the Context Menu.',
    version: 1,
  },
};

type ContextMenuNode =
  | {
      action?: () => void;
      label: string;
      telemetryEvent: keyof typeof telemetryEvents;
      type: 'action';
    }
  | {
      type: 'divider';
    }
  | {
      items: ContextMenuNode[];
      label: string;
      type: 'group';
    };

function isEqualSets(a: Set<string>, b: Set<string>): boolean {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}

function updateElementStyle(
  element: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
): void {
  for (const [key, value] of Object.entries(styles)) {
    if (value !== undefined) {
      element.style.setProperty(
        key.replace(/[A-Z]/g, (match) => `-${match.toLowerCase()}`),
        String(value),
      );
    }
  }
}

function lerp(v0: number, v1: number, t: number): number {
  return v0 * (1 - t) + v1 * t;
}

function clamp(number: number, min: number, max: number): number {
  return number < min ? min : number > max ? max : number;
}

function mapRange(
  number: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  const mapped =
    ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;

  return clamp(mapped, outMin, outMax);
}

function isAltKey(event: KeyboardEvent): boolean {
  return event.key === 'Alt';
}

function isHotkey(keys: string[], event: KeyboardEvent): boolean {
  const isMac = /Mac|iPod|iPhone|iPad/.test(window.navigator.platform);
  const modifiers: Record<
    string,
    'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey'
  > = {
    alt: 'altKey',
    ctrl: 'ctrlKey',
    mod: isMac ? 'metaKey' : 'ctrlKey',
    shift: 'shiftKey',
  };

  return keys.every((key) => {
    const modifier = modifiers[key];
    return modifier ? event[modifier] : event.key === key.toUpperCase();
  });
}

function targetsLink(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLAnchorElement ||
    (target instanceof HTMLElement && !!target.closest('a'))
  );
}

function getNodeId(element: ElementState): string | null {
  return 'id' in element.sanity ? element.sanity.id : null;
}

function getContextMenuTitle(
  field: { name?: string; title?: string } | null | undefined,
): string {
  return field?.title || field?.name || 'Unknown type';
}

function isReportableSanityNode(
  node: ElementState['sanity'],
): node is SanityNode {
  return 'id' in node;
}

function isSanityNode(node: ElementState['sanity']): node is SanityNode {
  return 'path' in node;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPerspectiveResponse(
  value: unknown,
): value is { perspective: ClientPerspective } {
  return isObject(value) && 'perspective' in value;
}

function isSchemaResponse(value: unknown): value is { schema: SchemaType[] } {
  return isObject(value) && Array.isArray(value['schema']);
}

function isPreviewSnapshotsResponse(
  value: unknown,
): value is { snapshots: PreviewSnapshot[] } {
  return isObject(value) && Array.isArray(value['snapshots']);
}

function isFeaturesResponse(
  value: unknown,
): value is { features: Record<string, boolean> } {
  return isObject(value) && isObject(value['features']);
}

function isSharedStateResponse(
  value: unknown,
): value is { state: Record<string, unknown> } {
  return isObject(value) && isObject(value['state']);
}

function createIntentLink(node: SanityNode): string {
  const { baseUrl, id, path, tool, type, workspace } = node;

  return createEditUrl({
    baseUrl,
    id,
    path: pathToUrlString(studioPath.fromString(path)),
    tool,
    type: type ?? '',
    workspace,
  });
}

function isDomNode(value: unknown): value is globalThis.Node {
  return value instanceof globalThis.Node;
}

function isAngularComponentDefinition(
  value: unknown,
): value is AngularOverlayComponentDefinition {
  return isObject(value) && 'component' in value;
}

function isAngularComponentType(
  value: unknown,
): value is AngularOverlayComponent {
  return typeof value === 'function';
}

function normalizeComponentDefinitions(
  value: ReturnType<NonNullable<VisualEditingOptions['components']>>,
): Array<AngularOverlayComponentDefinition | globalThis.Node> {
  if (!value) {
    return [];
  }

  if (isDomNode(value)) {
    return [value];
  }

  const values = Array.isArray(value) ? value : [value];
  const definitions: Array<
    AngularOverlayComponentDefinition | globalThis.Node
  > = [];

  for (const item of values) {
    if (isDomNode(item)) {
      definitions.push(item);
      continue;
    }

    if (isAngularComponentDefinition(item)) {
      definitions.push(item);
      continue;
    }

    if (isAngularComponentType(item)) {
      definitions.push({ component: item });
    }
  }

  return definitions;
}

type AngularComponentWithInputMetadata = Type<unknown> & {
  ɵcmp?: {
    inputs?: Record<string, unknown>;
  };
};

function hasDeclaredInput(component: Type<unknown>, input: string): boolean {
  const inputMetadata = (component as AngularComponentWithInputMetadata).ɵcmp
    ?.inputs;

  return !!inputMetadata && input in inputMetadata;
}

function setComponentValue(
  componentRef: ComponentRef<unknown>,
  key: string,
  value: unknown,
): void {
  if (hasDeclaredInput(componentRef.componentType, key)) {
    componentRef.setInput(key, value);
    return;
  }

  Reflect.set(componentRef.instance as object, key, value);
}

export class VisualEditingRuntime {
  #cleanup: Unsubscribe[] = [];
  #comlink?: VisualEditingNode;
  #comlinkStatus: Status = 'idle';
  #controller?: ReturnType<typeof createOverlayController>;
  #historySubscriptionCleanup?: Unsubscribe;
  #host: HTMLElement;
  #inFrame = false;
  #inPopUp = false;
  #lastReported?: {
    nodeIds: Set<string>;
    perspective: ClientPerspective;
  };
  #mutator?: MutatorActor;
  #optimisticActorReady = false;
  #options: VisualEditingOptions;
  #overlayEnabled = true;
  #previewSnapshots: PreviewSnapshot[] = [];
  #renderedOverlayCleanups: Unsubscribe[] = [];
  #observedMutatorDocumentIds = new Set<string>();
  #reportedUnresolvedPaths: UnresolvedPath[] = [];
  #resolvedTypes: ResolvedSchemaTypeMap = new Map();
  #root: HTMLElement;
  #schema: SchemaType[] = [];
  #sharedState: Record<string, unknown> = {};
  #startingMutator = false;
  #state: OverlayState = createInitialOverlayState();
  #warnedMissingAngularRenderer = false;

  constructor(options: VisualEditingOptions = {}, host?: HTMLElement) {
    this.#options = options;
    this.#host = host ?? this.#createHost();
    this.#root = document.createElement('div');
    this.#root.dataset['sanityOverlayElement'] = 'root';
    this.#host.appendChild(this.#root);
    this.#styleRoot();
  }

  start(): DisableVisualEditing {
    this.#inFrame = isMaybePreviewIframe();
    this.#inPopUp = isMaybePreviewWindow();

    this.#setupComlink();
    this.#setupController();
    this.#setupKeyboardAndLinkHandling();
    this.#render();

    return () => this.destroy();
  }

  update(options: VisualEditingOptions = {}): void {
    this.#options = options;
    this.#syncHistorySubscription();
    this.#styleRoot();
    this.#render();
  }

  destroy(): void {
    this.#clearRenderedOverlays();
    this.#historySubscriptionCleanup?.();
    this.#historySubscriptionCleanup = undefined;
    this.#stopDatasetMutator();
    for (const cleanup of this.#cleanup.splice(0)) {
      cleanup();
    }
    this.#controller?.destroy();
    this.#controller = undefined;
    this.#root.remove();
    if (!this.#host.hasChildNodes()) {
      this.#host.remove();
    }
  }

  #clearRenderedOverlays(): void {
    for (const cleanup of this.#renderedOverlayCleanups.splice(0)) {
      cleanup();
    }
    this.#root.replaceChildren();
  }

  #createHost(): HTMLElement {
    const host = document.createElement(ROOT_TAG);
    document.body.parentNode?.insertBefore(host, document.body.nextSibling);
    return host;
  }

  #styleRoot(): void {
    updateElementStyle(this.#host, {
      backgroundColor: 'transparent',
      direction: 'ltr',
      inset: '0',
      pointerEvents: 'none',
      position: 'absolute',
      width: '100%',
      zIndex: String(this.#options.zIndex ?? DEFAULT_Z_INDEX),
    });

    updateElementStyle(this.#root, {
      backgroundColor: 'transparent',
      direction: 'ltr',
      inset: '0',
      pointerEvents: 'none',
      position: 'absolute',
      width: '100%',
      zIndex: String(this.#options.zIndex ?? DEFAULT_Z_INDEX),
    });
  }

  #resizeRoot(): void {
    const height = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      window.innerHeight,
    );
    this.#host.style.height = `${height}px`;
    this.#root.style.height = `${height}px`;
  }

  #setupComlink(): void {
    if (!this.#inFrame && !this.#inPopUp) {
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

    this.#comlink = node;
    const unsubscribeStatus = node.onStatus(() => {
      this.#comlinkStatus = 'connected';
      this.#fetchPresentationState();
      this.#render();
    }, 'connected');
    const stop = node.start();

    this.#cleanup.push(() => {
      unsubscribeStatus();
      stop();
      this.#comlink = undefined;
      this.#comlinkStatus = 'idle';
    });

    this.#setupHistory();
    this.#setupMeta();
    this.#setupRefresh();
    this.#setupPresentationListeners();
  }

  #setupPresentationListeners(): void {
    const comlink = this.#comlink;
    if (!comlink) {
      return;
    }

    this.#cleanup.push(
      comlink.on('presentation/focus', (data) => {
        this.#dispatch({ type: 'presentation/focus', data });
      }),
      comlink.on('presentation/blur', (data) => {
        this.#dispatch({ type: 'presentation/blur', data });
      }),
      comlink.on('presentation/toggle-overlay', () => {
        this.#overlayEnabled = !this.#overlayEnabled;
        this.#syncControllerState();
      }),
      comlink.on('presentation/perspective', (data) => {
        this.#dispatch({ type: 'presentation/perspective', data });
      }),
      comlink.on('presentation/schema', (data) => {
        this.#schema = data.schema;
        this.#reportUnresolvedSchemaTypes();
        this.#render();
      }),
      comlink.on('presentation/preview-snapshots', (data) => {
        this.#previewSnapshots = data.snapshots;
        this.#render();
      }),
      comlink.on('presentation/shared-state', (data) => {
        if ('value' in data) {
          this.#sharedState = {
            ...this.#sharedState,
            [data.key]: data.value,
          };
          return;
        }

        this.#sharedState = Object.fromEntries(
          Object.entries(this.#sharedState).filter(([key]) => key !== data.key),
        );
      }),
    );
  }

  #setupHistory(): void {
    const comlink = this.#comlink;
    if (!comlink) {
      return;
    }

    this.#cleanup.push(
      comlink.on('presentation/navigate', (data) => {
        this.#options.history?.update(data);
      }),
    );

    this.#syncHistorySubscription();
  }

  #syncHistorySubscription(): void {
    this.#historySubscriptionCleanup?.();
    this.#historySubscriptionCleanup = undefined;

    const comlink = this.#comlink;
    const history = this.#options.history;

    if (!comlink || !history) {
      return;
    }

    this.#historySubscriptionCleanup = history.subscribe((update) => {
      update.title = update.title || document.title;
      comlink.post('visual-editing/navigate', update);
    });
  }

  #setupMeta(): void {
    const comlink = this.#comlink;
    if (!comlink) {
      return;
    }

    const sendMeta = () => {
      comlink.post('visual-editing/meta', { title: document.title });
    };

    const observer = new MutationObserver(([mutation]) => {
      if (mutation?.target.nodeName === 'TITLE') {
        sendMeta();
      }
    });

    observer.observe(document.head, {
      subtree: true,
      characterData: true,
      childList: true,
    });
    sendMeta();

    this.#cleanup.push(() => observer.disconnect());
  }

  #setupRefresh(): void {
    const comlink = this.#comlink;
    if (!comlink) {
      return;
    }

    let manualRefreshTimer = 0;
    let mutationRefreshTimer = 0;

    this.#cleanup.push(
      comlink.on('presentation/refresh', (data) => {
        const refresh = this.#options.refresh;
        if (!refresh) {
          return;
        }

        if (data.source === 'manual') {
          window.clearTimeout(manualRefreshTimer);
          const promise = refresh(data);
          if (promise === false) {
            return;
          }
          comlink.post('visual-editing/refreshing', data);
          let timedOut = false;
          manualRefreshTimer = window.setTimeout(() => {
            comlink.post('visual-editing/refreshed', data);
            timedOut = true;
          }, 3000);
          promise?.finally?.(() => {
            if (timedOut) {
              return;
            }
            window.clearTimeout(manualRefreshTimer);
            comlink.post('visual-editing/refreshed', data);
          });
          return;
        }

        if (data.source === 'mutation') {
          window.clearTimeout(mutationRefreshTimer);
          const promise = refresh(data);
          if (promise === false) {
            return;
          }
          comlink.post('visual-editing/refreshing', data);
          mutationRefreshTimer = window.setTimeout(() => {
            const retryPromise = refresh(data);
            if (retryPromise === false) {
              return;
            }
            comlink.post('visual-editing/refreshing', data);
            retryPromise.finally(() => {
              comlink.post('visual-editing/refreshed', data);
            });
          }, 1000);
          promise.finally(() => {
            comlink.post('visual-editing/refreshed', data);
          });
        }
      }),
      () => {
        window.clearTimeout(manualRefreshTimer);
        window.clearTimeout(mutationRefreshTimer);
      },
    );
  }

  #setupController(): void {
    this.#controller?.destroy();
    this.#controller = undefined;

    const handler: OverlayEventHandler = (message) => {
      if (message.type === 'element/click') {
        this.#comlink?.post('visual-editing/focus', message.sanity);
        this.#comlink?.post('visual-editing/telemetry-log', {
          event: telemetryEvents['Visual Editing Overlay Clicked'],
          data: null,
        });
      } else if (message.type === 'overlay/activate') {
        this.#comlink?.post('visual-editing/toggle', { enabled: true });
      } else if (message.type === 'overlay/deactivate') {
        this.#comlink?.post('visual-editing/toggle', { enabled: false });
      } else if (message.type === 'overlay/dragEnd') {
        window.dispatchEvent(
          new CustomEvent('sanity/dragEnd', {
            cancelable: true,
            detail: message,
          }),
        );
        const mutator = this.#mutator;
        if (mutator) {
          Promise.all([
            import('./optimistic/documents'),
            import('./optimistic/drag-events'),
          ])
            .then(([{ createDocumentsGet }, { handleDragEndEvent }]) => {
              handleDragEndEvent(message, createDocumentsGet(mutator));
            })
            .catch((error) => {
              console.warn(
                '[@limitless-angular/sanity] Failed to handle visual editing drag mutation.',
                error,
              );
            });
        }

        if (message.insertPosition) {
          this.#comlink?.post('visual-editing/telemetry-log', {
            event: telemetryEvents['Visual Editing Drag Sequence Completed'],
            data: null,
          });
        }
      } else if (message.type === 'overlay/dragUpdateCursorPosition') {
        this.#root.style.setProperty('--drag-preview-x', `${message.x}px`);
        this.#root.style.setProperty(
          '--drag-preview-y',
          `${message.y - window.scrollY}px`,
        );
        return;
      } else if (
        message.type === 'overlay/dragToggleMinimap' &&
        message.display === true
      ) {
        this.#comlink?.post('visual-editing/telemetry-log', {
          event: telemetryEvents['Visual Editing Drag Minimap Enabled'],
          data: null,
        });
      } else if (message.type === 'overlay/setCursor') {
        if (message.cursor) {
          message.element.style.cursor = message.cursor;
        } else {
          message.element.style.removeProperty('cursor');
        }
      }

      this.#dispatch(message);
    };

    this.#controller = createOverlayController({
      handler,
      inFrame: this.#inFrame,
      inPopUp: this.#inPopUp,
      optimisticActorReady: this.#optimisticActorReady,
      overlayElement: this.#root,
    });
    this.#syncControllerState();
  }

  #sendTelemetry(name: keyof typeof telemetryEvents): void {
    this.#comlink?.post('visual-editing/telemetry-log', {
      event: telemetryEvents[name],
      data: null,
    });
  }

  #setupKeyboardAndLinkHandling(): void {
    const handleClick = (event: MouseEvent) => {
      if (targetsLink(event.target) && event.altKey) {
        event.preventDefault();
        event.stopPropagation();
        const newEvent = new MouseEvent(event.type, {
          altKey: false,
          bubbles: true,
          cancelable: true,
          clientX: event.clientX,
          clientY: event.clientY,
          ctrlKey: event.ctrlKey,
          metaKey: event.metaKey,
          shiftKey: event.shiftKey,
        });
        event.target?.dispatchEvent(newEvent);
      }
    };

    const toggleOverlay = () => {
      this.#overlayEnabled = !this.#overlayEnabled;
      this.#syncControllerState();
    };

    const handleKeydown = (event: KeyboardEvent) => {
      if (isAltKey(event) || isHotkey(['mod', '\\'], event)) {
        toggleOverlay();
      }
    };

    const handleKeyup = (event: KeyboardEvent) => {
      if (isAltKey(event)) {
        toggleOverlay();
      }
    };

    window.addEventListener('click', handleClick);
    window.addEventListener('keydown', handleKeydown);
    window.addEventListener('keyup', handleKeyup);

    this.#cleanup.push(() => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('keyup', handleKeyup);
    });
  }

  #fetchPresentationState(): void {
    const comlink = this.#comlink;
    if (!comlink) {
      return;
    }

    const fetches: Array<Promise<unknown>> = [
      comlink
        .fetch('visual-editing/fetch-perspective', undefined, {
          suppressWarnings: true,
        })
        .then((data) => {
          if (isPerspectiveResponse(data)) {
            this.#dispatch({ type: 'presentation/perspective', data });
          }
        }),
      comlink
        .fetch('visual-editing/schema', undefined, {
          suppressWarnings: true,
        })
        .then((data) => {
          if (isSchemaResponse(data)) {
            this.#schema = data.schema;
            this.#reportUnresolvedSchemaTypes();
            this.#render();
          }
        }),
      comlink
        .fetch('visual-editing/preview-snapshots', undefined, {
          suppressWarnings: true,
        })
        .then((data) => {
          if (isPreviewSnapshotsResponse(data)) {
            this.#previewSnapshots = data.snapshots;
            this.#render();
          }
        }),
      comlink
        .fetch('visual-editing/shared-state', undefined, {
          suppressWarnings: true,
        })
        .then((data) => {
          if (isSharedStateResponse(data)) {
            this.#sharedState = data.state;
          }
        }),
    ];

    comlink
      .fetch('visual-editing/features', undefined, {
        suppressWarnings: true,
      })
      .then((data) => {
        if (!isFeaturesResponse(data)) {
          return;
        }

        const optimisticActorReady = data.features['optimistic'] === true;
        if (optimisticActorReady !== this.#optimisticActorReady) {
          this.#optimisticActorReady = optimisticActorReady;
          if (optimisticActorReady) {
            this.#startDatasetMutator();
          } else {
            this.#stopDatasetMutator();
          }
          this.#setupController();
          this.#render();
        }
      })
      .catch(() => {
        console.warn(
          '[@limitless-angular/sanity] Package version mismatch detected: Please update your Sanity studio to prevent potential compatibility issues.',
        );
      });

    for (const request of fetches) {
      request.catch(() => {
        // Presentation capabilities vary by Studio version; unsupported
        // optional calls intentionally fail silently upstream too.
      });
    }
  }

  #dispatch(message: OverlayMsg | VisualEditingControllerMsg): void {
    this.#state = overlayStateReducer(this.#state, message);
    this.#reportDocuments();
    this.#reportUnresolvedSchemaTypes();
    this.#render();
  }

  #syncControllerState(): void {
    if (this.#overlayEnabled) {
      this.#controller?.activate();
    } else {
      this.#controller?.deactivate();
    }
    this.#render();
  }

  #reportDocuments(): void {
    const comlink = this.#comlink;
    if (!comlink) {
      return;
    }

    const nodes = this.#state.elements
      .map((element) => element.sanity)
      .filter(isReportableSanityNode);
    const nodeIds = new Set(nodes.map((node) => node.id));
    this.#syncMutatorObservedDocuments(nodeIds);
    const perspective = this.#state.perspective;

    if (
      this.#lastReported &&
      isEqualSets(nodeIds, this.#lastReported.nodeIds) &&
      perspective === this.#lastReported.perspective
    ) {
      return;
    }

    const documents: ContentSourceMapDocuments = Array.from(nodeIds).map(
      (_id) => {
        const node = nodes.find((candidate) => candidate.id === _id);
        const _type = node?.type ?? '';
        return node?.projectId && node.dataset
          ? { _id, _type, _projectId: node.projectId, _dataset: node.dataset }
          : { _id, _type };
      },
    );

    this.#lastReported = { nodeIds, perspective };
    comlink.post('visual-editing/documents', {
      documents,
      perspective,
    });
  }

  #startDatasetMutator(): void {
    const comlink = this.#comlink;
    if (!comlink || this.#mutator || this.#startingMutator) {
      return;
    }

    this.#startingMutator = true;

    Promise.all([
      import('xstate'),
      import('./optimistic/context'),
      import('./optimistic/state/create-shared-listener'),
      import('./optimistic/state/dataset-mutator'),
    ])
      .then(
        ([
          { createActor },
          { setActor },
          { createSharedListener },
          { createDatasetMutator },
        ]) => {
          if (
            this.#mutator ||
            !this.#optimisticActorReady ||
            this.#comlink !== comlink
          ) {
            return;
          }

          const datasetMutator = createDatasetMutator(comlink);
          const sharedListener = createSharedListener(comlink);
          const mutator = createActor(datasetMutator, {
            input: {
              client: {
                withConfig: () => ({}),
              } as unknown as SanityClient,
              sharedListener,
            },
          }) as unknown as MutatorActor & { start: () => void };

          mutator.start();
          this.#mutator = mutator;
          setActor(mutator);
          this.#syncMutatorObservedDocuments();
        },
      )
      .catch((error) => {
        console.warn(
          '[@limitless-angular/sanity] Failed to start visual editing optimistic mutations.',
          error,
        );
      })
      .finally(() => {
        this.#startingMutator = false;
      });
  }

  #stopDatasetMutator(): void {
    this.#mutator?.stop();
    this.#mutator = undefined;
    this.#observedMutatorDocumentIds.clear();
  }

  #syncMutatorObservedDocuments(
    nodeIds = new Set(
      this.#state.elements
        .map((element) => element.sanity)
        .filter(isReportableSanityNode)
        .map((node) => node.id),
    ),
  ): void {
    const mutator = this.#mutator;
    if (!mutator) {
      return;
    }

    const nextDocumentIds = new Set<string>();
    for (const nodeId of nodeIds) {
      nextDocumentIds.add(getDraftId(nodeId));
      nextDocumentIds.add(getPublishedId(nodeId));
    }

    for (const documentId of this.#observedMutatorDocumentIds) {
      if (!nextDocumentIds.has(documentId)) {
        mutator.send({ type: 'unobserve', documentId });
      }
    }

    for (const documentId of nextDocumentIds) {
      if (!this.#observedMutatorDocumentIds.has(documentId)) {
        mutator.send({ type: 'observe', documentId });
      }
    }

    this.#observedMutatorDocumentIds = nextDocumentIds;
  }

  #reportUnresolvedSchemaTypes(): void {
    const comlink = this.#comlink;
    if (!comlink || !this.#schema.length) {
      return;
    }

    const paths = getPathsWithUnresolvedTypes(this.#state.elements);
    if (
      !paths.length ||
      haveSameUnresolvedPaths(this.#reportedUnresolvedPaths, paths)
    ) {
      return;
    }

    comlink
      .fetch(
        'visual-editing/schema-union-types',
        { paths },
        { suppressWarnings: true },
      )
      .then((data) => {
        if (isObject(data) && data['types'] instanceof Map) {
          this.#resolvedTypes = data['types'];
          this.#reportedUnresolvedPaths = paths;
          this.#render();
        }
      })
      .catch(() => {
        // Optional Presentation capability; unsupported versions fail silently.
      });
  }

  #render(): void {
    this.#resizeRoot();
    this.#clearRenderedOverlays();

    if (
      (this.#inFrame || this.#inPopUp) &&
      this.#comlinkStatus !== 'connected'
    ) {
      return;
    }

    if (this.#state.contextMenu) {
      this.#appendContextMenu();
    }

    if (this.#state.isDragging) {
      this.#appendDragOverlays();
      return;
    }

    for (const element of this.#state.elements) {
      if (!element.activated && !element.focused) {
        continue;
      }

      this.#root.appendChild(this.#createElementOverlay(element));
    }
  }

  #appendDragOverlays(): void {
    const {
      dragGroupRect,
      dragInsertPosition,
      dragMinimapTransition,
      dragShowMinimapPrompt,
      dragSkeleton,
    } = this.#state;

    if (!dragMinimapTransition) {
      if (dragInsertPosition) {
        this.#root.appendChild(
          this.#createDragInsertMarker(dragInsertPosition),
        );
      }

      if (dragShowMinimapPrompt) {
        this.#root.appendChild(this.#createMinimapPrompt());
      }

      if (dragGroupRect) {
        this.#root.appendChild(this.#createDragGroupRect(dragGroupRect));
      }
    }

    if (dragSkeleton) {
      this.#root.appendChild(this.#createDragPreview(dragSkeleton));
    }
  }

  #createDragInsertMarker(
    dragInsertPosition: NonNullable<OverlayState['dragInsertPosition']>,
  ): HTMLElement {
    const flow =
      dragInsertPosition.left || dragInsertPosition.right
        ? 'horizontal'
        : 'vertical';

    let x = 0;
    let y = 0;
    let width = 0;
    let height = 0;
    const offsetMultiplier = 0.0125;

    if (flow === 'horizontal') {
      const { left, right } = dragInsertPosition;

      width = DRAG_INSERT_MARKER_THICKNESS;

      if (right && left) {
        const startX = left.rect.x + left.rect.w;
        const endX = right.rect.x;
        const targetHeight = Math.min(right.rect.h, left.rect.h);
        const offset = targetHeight * offsetMultiplier;

        x = lerp(startX, endX, 0.5) - DRAG_INSERT_MARKER_THICKNESS / 2;
        y = left.rect.y + offset;
        height = Math.min(right.rect.h, left.rect.h) - offset * 2;
      } else if (right && !left) {
        const targetHeight = right.rect.h;
        const offset = targetHeight * offsetMultiplier;

        x = right.rect.x - DRAG_INSERT_MARKER_THICKNESS / 2;
        y = right.rect.y + offset;
        height = right.rect.h - offset * 2;
      } else if (left && !right) {
        const targetHeight = left.rect.h;
        const offset = targetHeight * offsetMultiplier;

        x = left.rect.x + left.rect.w - DRAG_INSERT_MARKER_THICKNESS / 2;
        y = left.rect.y + offset;
        height = left.rect.h - offset * 2;
      }
    } else {
      const { bottom, top } = dragInsertPosition;

      if (bottom && top) {
        const startX = Math.min(top.rect.x, bottom.rect.x);
        const startY = top.rect.y + top.rect.h;
        const endY = bottom.rect.y;
        const targetWidth = Math.min(bottom.rect.w, top.rect.w);
        const offset = targetWidth * offsetMultiplier;

        height = DRAG_INSERT_MARKER_THICKNESS;
        x = startX + offset;
        y = lerp(startY, endY, 0.5) - DRAG_INSERT_MARKER_THICKNESS / 2;
        width = Math.max(bottom.rect.w, top.rect.w) - offset * 2;
      } else if (bottom && !top) {
        const targetWidth = bottom.rect.w;
        const offset = targetWidth * offsetMultiplier;

        x = bottom.rect.x + offset;
        y = bottom.rect.y - DRAG_INSERT_MARKER_THICKNESS / 2;
        width = bottom.rect.w - offset * 2;
        height = DRAG_INSERT_MARKER_THICKNESS;
      } else if (top && !bottom) {
        const targetWidth = top.rect.w;
        const offset = targetWidth * offsetMultiplier;

        x = top.rect.x + offset;
        y = top.rect.y + top.rect.h - DRAG_INSERT_MARKER_THICKNESS / 2;
        width = top.rect.w - offset * 2;
        height = DRAG_INSERT_MARKER_THICKNESS;
      }
    }

    const marker = document.createElement('div');
    marker.dataset['sanityOverlayElement'] = 'drag-insert-marker';
    updateElementStyle(marker, {
      background: '#556bfc',
      border: '2px solid white',
      borderRadius: '999px',
      height: `${height}px`,
      position: 'absolute',
      transform: `translate(${x}px, ${y}px)`,
      width: `${width}px`,
      zIndex: '999999',
    });

    return marker;
  }

  #createDragGroupRect(
    dragGroupRect: NonNullable<OverlayState['dragGroupRect']>,
  ): HTMLElement {
    const groupRect = document.createElement('div');
    groupRect.dataset['sanityOverlayElement'] = 'drag-group-rect';
    updateElementStyle(groupRect, {
      border: '1px dashed #f0709b',
      height: `${dragGroupRect.h - 1}px`,
      left: `${dragGroupRect.x}px`,
      pointerEvents: 'none',
      position: 'absolute',
      top: `${dragGroupRect.y}px`,
      width: `${dragGroupRect.w - 1}px`,
    });

    return groupRect;
  }

  #createMinimapPrompt(): HTMLElement {
    const prompt = document.createElement('div');
    prompt.dataset['sanityOverlayElement'] = 'minimap-prompt';
    updateElementStyle(prompt, {
      alignItems: 'center',
      background: '#fff',
      borderRadius: '6px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.18)',
      bottom: '2rem',
      color: '#1f2937',
      display: 'flex',
      fontFamily:
        'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '12px',
      fontWeight: '600',
      gap: '8px',
      left: '2rem',
      lineHeight: '16px',
      padding: '6px 8px',
      pointerEvents: 'none',
      position: 'fixed',
      zIndex: '999999',
    });

    const hotkey = document.createElement('kbd');
    hotkey.textContent = 'Shift';
    updateElementStyle(hotkey, {
      background: '#f3f4f6',
      border: '1px solid #d1d5db',
      borderRadius: '4px',
      color: '#374151',
      fontFamily: 'inherit',
      fontSize: '11px',
      lineHeight: '14px',
      padding: '1px 5px',
    });

    const label = document.createElement('span');
    label.textContent = 'Zoom Out';

    const icon = document.createElement('span');
    icon.textContent = '↗';
    icon.ariaHidden = 'true';

    prompt.append(hotkey, label, icon);

    return prompt;
  }

  #createDragPreview(
    skeleton: NonNullable<OverlayState['dragSkeleton']>,
  ): HTMLElement {
    const maxSkeletonWidth = Math.min(skeleton.maxWidth, window.innerWidth / 2);
    const scaleFactor =
      skeleton.w > maxSkeletonWidth ? maxSkeletonWidth / skeleton.w : 1;
    const radius = Math.round(mapRange(skeleton.w, 0, 1920, 3, 12));
    const preview = document.createElement('div');
    preview.dataset['sanityOverlayElement'] = 'drag-preview';

    updateElementStyle(preview, {
      cursor: 'move',
      display: 'grid',
      height: `${skeleton.h}px`,
      opacity: '0.98',
      position: 'fixed',
      transform: `translate(calc(var(--drag-preview-x) - ${skeleton.w / 2}px), calc(var(--drag-preview-y) - ${skeleton.h / 2}px)) scale(${scaleFactor})`,
      width: `${skeleton.w}px`,
      zIndex: '9999999',
    });

    const card = document.createElement('div');
    updateElementStyle(card, {
      background: '#fff',
      borderRadius: `${radius}px`,
      boxShadow:
        '0 16px 48px rgba(31, 41, 55, 0.24), 0 2px 8px rgba(31, 41, 55, 0.12)',
      height: '100%',
      overflow: 'hidden',
      position: 'relative',
      width: '100%',
    });

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', `0 0 ${skeleton.w} ${skeleton.h}`);
    svg.style.inset = '0';
    svg.style.position = 'absolute';

    const imageRects = skeleton.childRects.filter(
      (rect) => rect.tagName === 'IMG',
    );
    const textRects = skeleton.childRects.filter(
      (rect) => rect.tagName !== 'IMG',
    );

    for (const rect of [...imageRects, ...textRects]) {
      const skeletonRect = document.createElementNS(
        'http://www.w3.org/2000/svg',
        'rect',
      );
      skeletonRect.setAttribute('x', String(rect.x));
      skeletonRect.setAttribute('y', String(rect.y));
      skeletonRect.setAttribute('width', String(rect.w));
      skeletonRect.setAttribute('height', String(rect.h));
      skeletonRect.setAttribute('fill', '#e5e7eb');
      svg.appendChild(skeletonRect);
    }

    card.appendChild(svg);
    preview.appendChild(card);

    return preview;
  }

  #appendContextMenu(): void {
    const contextMenu = this.#state.contextMenu;
    const mutator = this.#mutator;

    if (!contextMenu || !mutator) {
      return;
    }

    const schema = createSchemaContext(this.#schema, this.#resolvedTypes);
    const { field, parent } = schema.getField(contextMenu.node);
    const title = getContextMenuTitle(field);
    const menu = document.createElement('div');
    menu.dataset['sanityOverlayElement'] = 'context-menu';
    menu.role = 'menu';
    menu.ariaLabel = title;

    updateElementStyle(menu, {
      background: '#fff',
      border: '1px solid rgba(31, 41, 55, 0.12)',
      borderRadius: '6px',
      boxShadow:
        '0 20px 48px rgba(31, 41, 55, 0.22), 0 2px 8px rgba(31, 41, 55, 0.12)',
      color: '#1f2937',
      fontFamily:
        'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '13px',
      left: `${Math.max(8, contextMenu.position.x)}px`,
      lineHeight: '18px',
      maxHeight: 'min(440px, calc(100vh - 16px))',
      maxWidth: '220px',
      minWidth: '140px',
      overflow: 'auto',
      pointerEvents: 'all',
      position: 'fixed',
      top: `${Math.max(8, contextMenu.position.y)}px`,
      zIndex: '9999999',
    });

    menu.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    menu.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });

    const header = document.createElement('div');
    updateElementStyle(header, {
      borderBottom: '1px solid rgba(31, 41, 55, 0.08)',
      fontWeight: '600',
      overflow: 'hidden',
      padding: '8px 10px',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    });
    header.textContent = title;
    menu.appendChild(header);
    this.#root.appendChild(menu);

    let disposed = false;
    const animationFrame = requestAnimationFrame(() => {
      const rect = menu.getBoundingClientRect();
      const left = Math.max(
        8,
        Math.min(contextMenu.position.x, window.innerWidth - rect.width - 8),
      );
      const top = Math.max(
        8,
        Math.min(contextMenu.position.y, window.innerHeight - rect.height - 8),
      );

      menu.style.left = `${left}px`;
      menu.style.top = `${top}px`;
    });

    this.#renderedOverlayCleanups.push(() => {
      disposed = true;
      cancelAnimationFrame(animationFrame);
    });

    Promise.all([import('./optimistic/documents'), import('./context-menu')])
      .then(([{ createDocumentsGet }, { getContextMenuItems }]) =>
        getContextMenuItems({
          doc: createDocumentsGet(mutator)(contextMenu.node.id),
          field,
          node: contextMenu.node,
          parent,
        }),
      )
      .then((items) => {
        if (disposed || !menu.isConnected) {
          return;
        }

        if (!items.length) {
          const empty = document.createElement('div');
          empty.textContent = 'No actions';
          updateElementStyle(empty, {
            color: '#6b7280',
            padding: '8px 10px',
          });
          menu.appendChild(empty);
          return;
        }

        for (const item of items) {
          menu.appendChild(this.#createContextMenuItem(item));
        }
      })
      .catch((error) => {
        if (disposed || !menu.isConnected) {
          return;
        }

        console.warn(
          '[@limitless-angular/sanity] Failed to render visual editing context menu.',
          error,
        );
        header.textContent = 'Unavailable';
      });
  }

  #createContextMenuItem(item: ContextMenuNode): HTMLElement {
    if (item.type === 'divider') {
      const divider = document.createElement('div');
      divider.role = 'separator';
      updateElementStyle(divider, {
        borderTop: '1px solid rgba(31, 41, 55, 0.08)',
        margin: '4px 0',
      });

      return divider;
    }

    if (item.type === 'group') {
      const group = document.createElement('div');
      const label = document.createElement('div');
      label.textContent = item.label;
      updateElementStyle(label, {
        color: '#6b7280',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0',
        padding: '7px 10px 3px',
        textTransform: 'uppercase',
      });
      group.appendChild(label);

      for (const child of item.items) {
        const childElement = this.#createContextMenuItem(child);
        updateElementStyle(childElement, {
          paddingLeft: child.type === 'action' ? '18px' : undefined,
        });
        group.appendChild(childElement);
      }

      return group;
    }

    const button = document.createElement('button');
    button.role = 'menuitem';
    button.type = 'button';
    button.textContent = item.label;
    button.disabled = !item.action;
    updateElementStyle(button, {
      background: 'transparent',
      border: '0',
      boxSizing: 'border-box',
      color: item.action ? '#1f2937' : '#9ca3af',
      cursor: item.action ? 'pointer' : 'default',
      display: 'block',
      font: 'inherit',
      padding: '7px 10px',
      textAlign: 'left',
      width: '100%',
    });

    button.addEventListener('mouseenter', () => {
      if (!item.action) {
        return;
      }
      button.style.background = 'rgba(85, 107, 252, 0.08)';
    });
    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
    });
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!item.action) {
        return;
      }

      item.action();
      this.#sendTelemetry(item.telemetryEvent);
      this.#dispatch({ type: 'overlay/blur' });
    });

    return button;
  }

  #createElementOverlay(element: ElementState): HTMLElement {
    const overlay = document.createElement('div');
    overlay.dataset['sanityOverlayElement'] = 'capture';
    const focused = !!element.focused;
    const hovered = element.hovered;
    const nodeId = getNodeId(element);

    if (nodeId) {
      overlay.dataset['sanityDocumentId'] = nodeId;
    }

    updateElementStyle(overlay, {
      background: focused
        ? 'rgba(85, 140, 255, 0.08)'
        : hovered
          ? 'rgba(85, 140, 255, 0.05)'
          : 'transparent',
      border: focused
        ? '2px solid rgb(85, 140, 255)'
        : hovered
          ? '1px solid rgb(85, 140, 255)'
          : '1px solid rgba(85, 140, 255, 0.6)',
      borderRadius: '3px',
      boxSizing: 'border-box',
      height: `${Math.max(element.rect.h, 0)}px`,
      pointerEvents: 'none',
      position: 'absolute',
      transform: `translate(${element.rect.x}px, ${element.rect.y}px)`,
      transition: 'none',
      willChange: 'transform',
      width: `${Math.max(element.rect.w, 0)}px`,
    });

    if (hovered) {
      this.#appendDefaultOverlayChrome(overlay, element);
      this.#appendCustomOverlayComponents(overlay, element);
    }

    return overlay;
  }

  #appendDefaultOverlayChrome(
    overlay: HTMLElement,
    element: ElementState,
  ): void {
    const node = element.sanity;

    if (!isSanityNode(node)) {
      return;
    }

    const title = this.#previewSnapshots.find(
      (snapshot) => snapshot._id === node.id,
    )?.title;

    if (title) {
      const label = document.createElement('div');
      label.textContent = String(title);
      updateElementStyle(label, {
        alignItems: 'center',
        background: 'rgb(85, 140, 255)',
        borderRadius: '3px',
        bottom: '100%',
        color: '#fff',
        display: 'flex',
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: '12px',
        fontWeight: '600',
        left: '0',
        lineHeight: '16px',
        maxWidth: 'min(280px, 100vw)',
        overflow: 'hidden',
        padding: '4px 8px',
        position: 'absolute',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      });
      overlay.appendChild(label);
    }

    if (this.#inFrame) {
      return;
    }

    const actions = document.createElement('div');
    actions.dataset['sanityOverlayElement'] = 'actions';
    updateElementStyle(actions, {
      bottom: '100%',
      pointerEvents: 'all',
      position: 'absolute',
      right: '0',
    });

    const link = document.createElement('a');
    link.href = getLinkHref(createIntentLink(node), window.location.href);
    link.rel = 'noopener noreferrer';
    link.target = '_blank';
    link.textContent = 'Open in Studio';
    updateElementStyle(link, {
      background: 'rgb(85, 140, 255)',
      borderRadius: '3px',
      color: '#fff',
      display: 'block',
      fontFamily:
        'Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSize: '12px',
      fontWeight: '600',
      lineHeight: '16px',
      padding: '4px 8px',
      textDecoration: 'none',
      whiteSpace: 'nowrap',
    });

    actions.appendChild(link);
    overlay.appendChild(actions);
  }

  #appendCustomOverlayComponents(
    overlay: HTMLElement,
    element: ElementState,
  ): void {
    const componentResolver = this.#options.components;
    if (!componentResolver || !this.#optimisticActorReady) {
      return;
    }

    const context = this.#createOverlayComponentContext(element);
    if (!context) {
      return;
    }

    const resolvedComponents = normalizeComponentDefinitions(
      componentResolver(context),
    );

    for (const component of resolvedComponents) {
      if (isDomNode(component)) {
        overlay.appendChild(component);
        continue;
      }

      this.#appendAngularOverlayComponent(overlay, component, context);
    }
  }

  #createOverlayComponentContext(
    element: ElementState,
  ): OverlayComponentResolverContext | undefined {
    const node = element.sanity;
    if (!isSanityNode(node)) {
      return undefined;
    }

    const schema = createSchemaContext(this.#schema, this.#resolvedTypes);
    const document = schema.getType(node);
    const { field, parent } = schema.getField(node);

    if (!document || !field) {
      return undefined;
    }

    return {
      document,
      element: element.element,
      field,
      focused: !!element.focused,
      node,
      parent,
      type: field.value.type,
    };
  }

  #appendAngularOverlayComponent(
    overlay: HTMLElement,
    definition: AngularOverlayComponentDefinition,
    context: OverlayComponentResolverContext,
  ): void {
    const { applicationRef, environmentInjector, injector } = this.#options;

    if (!applicationRef || !environmentInjector) {
      if (!this.#warnedMissingAngularRenderer) {
        console.warn(
          '[@limitless-angular/sanity] Custom visual editing overlay components require Angular applicationRef and environmentInjector options.',
        );
        this.#warnedMissingAngularRenderer = true;
      }
      return;
    }

    const hostElement = document.createElement('div');
    updateElementStyle(hostElement, {
      inset: '0',
      pointerEvents: 'none',
      position: 'absolute',
    });
    overlay.appendChild(hostElement);

    const componentRef = createComponent(definition.component, {
      elementInjector: injector,
      environmentInjector,
      hostElement,
    });
    const inputs = {
      PointerEvents: VisualEditingPointerEventsComponent,
      ...context,
      ...(definition.props ?? {}),
      ...(definition.inputs ?? {}),
    };

    for (const [key, value] of Object.entries(inputs)) {
      setComponentValue(componentRef, key, value);
    }

    applicationRef.attachView(componentRef.hostView);
    componentRef.changeDetectorRef.detectChanges();
    this.#renderedOverlayCleanups.push(() => {
      applicationRef.detachView(componentRef.hostView as ViewRef);
      componentRef.destroy();
    });
  }
}
