import {
  createComponent,
  type ComponentRef,
  type Type,
  type ViewRef,
} from '@angular/core';
import type {
  ClientPerspective,
  ContentSourceMapDocuments,
} from '@sanity/client';
import { createEditUrl, studioPath } from '@sanity/client/csm';
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
  HistoryAdapter,
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
  #host: HTMLElement;
  #inFrame = false;
  #inPopUp = false;
  #lastReported?: {
    nodeIds: Set<string>;
    perspective: ClientPerspective;
  };
  #optimisticActorReady = false;
  #options: VisualEditingOptions;
  #overlayEnabled = true;
  #previewSnapshots: PreviewSnapshot[] = [];
  #renderedOverlayCleanups: Unsubscribe[] = [];
  #reportedUnresolvedPaths: UnresolvedPath[] = [];
  #resolvedTypes: ResolvedSchemaTypeMap = new Map();
  #root: HTMLElement;
  #schema: SchemaType[] = [];
  #sharedState: Record<string, unknown> = {};
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
    this.#styleRoot();
    this.#render();
  }

  destroy(): void {
    this.#clearRenderedOverlays();
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

    this.#setupHistory(this.#options.history);
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

  #setupHistory(history?: HistoryAdapter): void {
    const comlink = this.#comlink;
    if (!comlink) {
      return;
    }

    this.#cleanup.push(
      comlink.on('presentation/navigate', (data) => {
        history?.update(data);
      }),
    );

    if (history) {
      this.#cleanup.push(
        history.subscribe((update) => {
          update.title = update.title || document.title;
          comlink.post('visual-editing/navigate', update);
        }),
      );
    }
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
    const refresh = this.#options.refresh;
    if (!comlink || !refresh) {
      return;
    }

    let manualRefreshTimer = 0;
    let mutationRefreshTimer = 0;

    this.#cleanup.push(
      comlink.on('presentation/refresh', (data) => {
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

        if (message.insertPosition) {
          this.#comlink?.post('visual-editing/telemetry-log', {
            event: telemetryEvents['Visual Editing Drag Sequence Completed'],
            data: null,
          });
        }
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
            this.#setupController();
            this.#render();
          }
        }),
    ];

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
      ((this.#inFrame || this.#inPopUp) &&
        this.#comlinkStatus !== 'connected') ||
      this.#state.isDragging
    ) {
      return;
    }

    for (const element of this.#state.elements) {
      if (!element.activated && !element.focused) {
        continue;
      }

      this.#root.appendChild(this.#createElementOverlay(element));
    }
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
