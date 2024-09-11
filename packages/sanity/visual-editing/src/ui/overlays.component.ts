import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import type {
  ClientPerspective,
  ContentSourceMapDocuments,
} from '@sanity/client';
import type {
  HistoryAdapter,
  OverlayEventHandler,
  OverlayMsg,
  SanityNode,
} from '@sanity/visual-editing';

// eslint-disable-next-line @nx/enforce-module-boundaries
import { type ChannelStatus } from '@repo/channels';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { DRAFTS_PREFIX } from '@repo/visual-editing-helpers/csm';
// eslint-disable-next-line @nx/enforce-module-boundaries
import {
  isAltKey,
  isHotkey,
  type PresentationMsg,
} from '@repo/visual-editing-helpers';
import { type OverlayState, overlayStateReducer } from './overlayStateReducer';
import { fromEvent } from 'rxjs';
import { ElementOverlayComponent } from './element-overlay.component';
import { injectController } from './injectController';
import { VisualEditingChannel } from '../types';

function raf2(fn: () => void) {
  let r0: number | undefined = undefined;
  let r1: number | undefined = undefined;

  r0 = requestAnimationFrame(() => {
    r1 = requestAnimationFrame(fn);
  });

  return () => {
    if (r0 !== undefined) cancelAnimationFrame(r0);
    if (r1 !== undefined) cancelAnimationFrame(r1);
  };
}

function isEqualSets(a: Set<string>, b: Set<string>) {
  if (a === b) return true;
  if (a.size !== b.size) return false;
  for (const value of a) if (!b.has(value)) return false;
  return true;
}

/**
 * @internal
 */
@Component({
  selector: `lib-overlays`,
  standalone: true,
  template: `
    <div class="root" [style.zIndex]="zIndex() ?? '9999999'" #rootElement>
      @for (element of elementsToRender(); track element.id) {
        <lib-element-overlay
          [rect]="element.rect"
          [focused]="element.focused"
          [hovered]="element.hovered"
          [showActions]="!channel().inFrame"
          [sanity]="element.sanity"
          [wasMaybeCollapsed]="
            element.focused && overlayState().wasMaybeCollapsed
          "
        />
      }
    </div>
  `,
  styles: `
    .root {
      background-color: transparent;
      direction: ltr;
      inset: 0;
      pointer-events: none;
      position: absolute;
      width: 100%;
      height: 100%;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ElementOverlayComponent],
})
export class OverlaysComponent {
  channel = input.required<VisualEditingChannel>();

  history = input<HistoryAdapter>();

  zIndex = input<string | number>();

  rootElement = viewChild.required<ElementRef<HTMLDivElement>>('rootElement');

  status = signal<ChannelStatus | undefined>(undefined);

  overlayEnabled = signal(true);

  overlaysFlash = signal(false);

  fadingOut = signal(false);

  fadeOutTimeoutRef: NodeJS.Timeout | undefined;

  // Based on overlayStateReducer https://github.com/sanity-io/visual-editing/blob/main/packages/visual-editing/src/ui/Overlays.tsx#L68
  overlayState = signal<OverlayState>({
    elements: [],
    focusPath: '',
    wasMaybeCollapsed: false,
    perspective: 'published',
  });

  elementsToRender = computed(() => {
    if (
      !this.channel() ||
      (this.channel().inFrame && this.status() !== 'connected')
    ) {
      return [];
    }

    return this.overlayState().elements.filter((e) => e.activated || e.focused);
  });

  private lastReported = signal<
    { nodeIds: Set<string>; perspective: ClientPerspective } | undefined
  >(undefined);

  private controller = injectController(
    this.rootElement().nativeElement,
    this.overlayEventHandler.bind(this),
    this.channel().inFrame,
  );

  constructor() {
    afterNextRender(() => {
      fromEvent<MouseEvent>(window, 'click')
        .pipe(takeUntilDestroyed())
        .subscribe((event) => this.handleClick(event));

      fromEvent<KeyboardEvent>(window, 'keydown')
        .pipe(takeUntilDestroyed())
        .subscribe((event) => this.handleKeydown(event));

      fromEvent<KeyboardEvent>(window, 'keyup')
        .pipe(takeUntilDestroyed())
        .subscribe((event) => this.handleKeyUp(event));
    });

    effect(() => {
      const channel = this.channel();
      const history = this.history();

      const unsubscribeFromStatus = untracked(() =>
        channel.onStatusUpdate((status) => this.status.set(status)),
      );
      const unsubscribeFromEvents = untracked(() =>
        channel.subscribe((type, data) => {
          if (type === 'presentation/focus' && data.path?.length) {
            this.dispatch({ type, data });
          } else if (type === 'presentation/blur') {
            this.dispatch({ type, data });
          } else if (type === 'presentation/perspective') {
            this.dispatch({ type, data });
          } else if (type === 'presentation/navigate') {
            history?.update(data);
          } else if (type === 'presentation/toggleOverlay') {
            this.overlayEnabled.update((enabled) => !enabled);
          }
        }),
      );

      return () => {
        unsubscribeFromEvents();
        unsubscribeFromStatus();
      };
    });

    effect(() => {
      const elements = this.overlayState().elements;
      const perspective = this.overlayState().perspective;

      untracked(() => {
        // Report only nodes of type `SanityNode`. Untransformed `SanityStegaNode`
        // nodes without an `id`, are not reported as they will not contain the
        // necessary document data.
        const nodes = elements
          .map((e) => {
            const { sanity } = e;
            if (!('id' in sanity)) return null;
            return {
              ...sanity,
              id:
                'isDraft' in sanity
                  ? `${DRAFTS_PREFIX}${sanity.id}`
                  : sanity.id,
            };
          })
          .filter((s) => !!s) as SanityNode[];

        const nodeIds = new Set<string>(nodes.map((e) => e.id));
        const lastReported = this.lastReported();

        // Report if:
        // - Documents not yet reported
        // - Document IDs changed
        // - Perspective changed
        if (
          !lastReported ||
          !isEqualSets(nodeIds, lastReported.nodeIds) ||
          perspective !== lastReported.perspective
        ) {
          const documentsOnPage: ContentSourceMapDocuments = Array.from(
            nodeIds,
          ).map((_id) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const node = nodes.find((node) => node.id === _id)!;
            const { type, projectId: _projectId, dataset: _dataset } = node;
            return _projectId && _dataset
              ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                { _id, _type: type!, _projectId, _dataset }
              : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                { _id, _type: type! };
          });
          this.lastReported.set({ nodeIds, perspective });
          this.reportDocuments(documentsOnPage, perspective);
        }
      });
    });

    effect(() => {
      this.channel();
      if (this.overlayEnabled()) {
        this.controller?.activate();
      } else {
        this.controller?.deactivate();
      }
    });

    effect(() => {
      const history = this.history();
      const channel = this.channel();
      if (history) {
        return history.subscribe((update) => {
          update.title = update.title || document.title;
          channel.send('overlay/navigate', update);
        });
      }

      return;
    });

    effect(() => {
      const overlayEnabled = this.overlayEnabled();
      return untracked(() => {
        if (overlayEnabled) {
          return raf2(() => {
            this.overlaysFlash.set(true);
            raf2(() => {
              this.fadingOut.set(true);
              this.fadeOutTimeoutRef = setTimeout(() => {
                this.fadingOut.set(false);
                this.overlaysFlash.set(false);
              }, 1500);
            });
          });
        } else {
          clearTimeout(this.fadeOutTimeoutRef);
          this.overlaysFlash.set(false);
          this.fadingOut.set(false);
        }

        return;
      });
    });
  }

  private overlayEventHandler(message: Parameters<OverlayEventHandler>[0]) {
    if (message.type === 'element/click') {
      const { sanity } = message;
      this.channel().send('overlay/focus', sanity);
    } else if (message.type === 'overlay/activate') {
      this.channel().send('overlay/toggle', { enabled: true });
    } else if (message.type === 'overlay/deactivate') {
      this.channel().send('overlay/toggle', { enabled: false });
    }

    this.dispatch(message);
  }

  private dispatch(action: OverlayMsg | PresentationMsg) {
    const newState = overlayStateReducer(this.overlayState(), action);
    this.overlayState.set(newState);
  }

  private handleClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    const targetsLink = target.tagName === 'A' || !!target.closest('a');

    if (targetsLink && event.altKey) {
      event.preventDefault();
      event.stopPropagation();
      const newEvent = new MouseEvent(event.type, {
        ...event,
        altKey: false,
        bubbles: true,
        cancelable: true,
      });
      event.target?.dispatchEvent(newEvent);
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    if (isAltKey(e)) {
      this.overlayEnabled.update((enabled) => !enabled);
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    if (isAltKey(e)) {
      this.overlayEnabled.update((enabled) => !enabled);
    }

    if (isHotkey(['mod', '\\'], e)) {
      this.overlayEnabled.update((enabled) => !enabled);
    }
  }

  private reportDocuments(
    documents: ContentSourceMapDocuments,
    perspective: ClientPerspective,
  ) {
    this.channel()?.send('visual-editing/documents', {
      documents,
      perspective,
    });
  }
}
