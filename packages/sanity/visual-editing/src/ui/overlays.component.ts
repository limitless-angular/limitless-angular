import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import type { Status } from '@sanity/comlink';
import type { VisualEditingControllerMsg } from '@sanity/presentation-comlink';

import {
  createInitialOverlayState,
  overlayStateReducer,
} from './overlay-state-reducer';
import type {
  AngularOverlayComponentResolver,
  ElementState,
  OverlayMsg,
  VisualEditingNode,
} from '../types';
import { sanityNodesExistInSameArray } from '../util/find-sanity-nodes';
import { ContextMenuComponent } from './context-menu/context-menu.component';
import { DatasetMutatorService } from './dataset-mutator.service';
import { DocumentReporterComponent } from './document-reporter.component';
import { DocumentsService } from './documents.service';
import { ElementOverlayComponent } from './element-overlay.component';
import { OverlayDragGroupRectComponent } from './overlay-drag-group-rect.component';
import { OverlayDragInsertMarkerComponent } from './overlay-drag-insert-marker.component';
import { OverlayDragPreviewComponent } from './overlay-drag-preview.component';
import { OverlayMinimapPromptComponent } from './overlay-minimap-prompt.component';
import { OverlaysControllerComponent } from './overlays-controller.component';
import { OptimisticService } from './optimistic.service';
import { PerspectiveSyncComponent } from './perspective-sync.component';
import { PreviewSnapshotsService } from './preview/preview-snapshots.service';
import { ReportDocumentsService } from './report-documents.service';
import { SchemaService } from './schema/schema.service';
import { SharedStateService } from './shared-state/shared-state.service';
import { TelemetryService } from './telemetry/telemetry.service';

type RenderElement = ElementState & {
  draggable: boolean;
};

function raf2(fn: () => void): () => void {
  let r1: number | undefined;
  const r0 = requestAnimationFrame(() => {
    r1 = requestAnimationFrame(fn);
  });

  return () => {
    cancelAnimationFrame(r0);
    if (r1 !== undefined) {
      cancelAnimationFrame(r1);
    }
  };
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

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-overlays',
  standalone: true,
  imports: [
    ContextMenuComponent,
    DocumentReporterComponent,
    OverlayDragGroupRectComponent,
    OverlayDragInsertMarkerComponent,
    OverlayDragPreviewComponent,
    ElementOverlayComponent,
    OverlayMinimapPromptComponent,
    OverlaysControllerComponent,
    PerspectiveSyncComponent,
  ],
  providers: [
    PreviewSnapshotsService,
    DocumentsService,
    OptimisticService,
    ReportDocumentsService,
    SchemaService,
    SharedStateService,
    TelemetryService,
  ],
  template: `
    <div
      class="root"
      [attr.data-fading-out]="fadingOut() ? '' : null"
      [attr.data-overlays]="overlaysFlash() ? '' : null"
      [style.z-index]="zIndex() ?? '9999999'"
      [style.height.px]="rootHeight()"
      #rootElement
    >
      <sanity-visual-editing-document-reporter
        [documentIds]="documentIds()"
        [perspective]="overlayState().perspective"
      />
      <sanity-visual-editing-perspective-sync
        [comlink]="comlink()"
        (perspectiveMessage)="dispatch($event)"
      />
      <sanity-visual-editing-overlays-controller
        [comlink]="comlink()"
        [inFrame]="inFrame()"
        [inPopUp]="inPopUp()"
        [overlayEnabled]="overlayEnabled()"
        [rootElement]="rootElementRef()?.nativeElement"
        (dragPosition)="updateDragPreviewCustomProps($event.x, $event.y)"
        (controllerMessage)="dispatch($event)"
      />

      @if (overlayState().contextMenu; as contextMenu) {
        <sanity-visual-editing-context-menu
          [contextMenu]="contextMenu"
          (dismiss)="closeContextMenu()"
          (telemetry)="telemetry.send($event)"
        />
      }

      @for (element of elementsToRender(); track element.id) {
        <sanity-visual-editing-element-overlay
          [componentResolver]="componentResolver()"
          [draggable]="element.draggable"
          [element]="element.element"
          [enableScrollIntoView]="enableScrollIntoView()"
          [focused]="element.focused"
          [hovered]="element.hovered"
          [isDragging]="
            overlayState().isDragging || overlayState().dragMinimapTransition
          "
          [node]="element.sanity"
          [rect]="element.rect"
          [showActions]="!inFrame()"
          [wasMaybeCollapsed]="
            element.focused && overlayState().wasMaybeCollapsed
          "
        />
      }

      @if (overlayState().isDragging && !overlayState().dragMinimapTransition) {
        @if (overlayState().dragInsertPosition; as dragInsertPosition) {
          <sanity-visual-editing-drag-insert-marker
            [dragInsertPosition]="dragInsertPosition"
          />
        }
        @if (overlayState().dragShowMinimapPrompt) {
          <sanity-visual-editing-minimap-prompt />
        }
        @if (overlayState().dragGroupRect; as dragGroupRect) {
          <sanity-visual-editing-drag-group-rect
            [dragGroupRect]="dragGroupRect"
          />
        }
      }

      @if (
        overlayState().isDragging && overlayState().dragSkeleton;
        as skeleton
      ) {
        <sanity-visual-editing-drag-preview [skeleton]="skeleton" />
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
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OverlaysComponent {
  comlink = input<VisualEditingNode>();
  comlinkStatus = input<Status>('idle');
  components = input<AngularOverlayComponentResolver>();
  inFrame = input.required<boolean>();
  inPopUp = input.required<boolean>();
  zIndex = input<string | number>();

  protected datasetMutator = inject(DatasetMutatorService);
  protected telemetry = inject(TelemetryService);
  private reportDocuments = inject(ReportDocumentsService);
  private schema = inject(SchemaService);

  protected overlayState = signal(createInitialOverlayState());
  protected overlaysFlash = signal(false);
  protected fadingOut = signal(false);
  protected rootHeight = signal(0);
  protected overlayEnabled = signal(true);
  protected rootElementRef = viewChild<ElementRef<HTMLElement>>('rootElement');

  private fadeOutTimeoutRef: ReturnType<typeof setTimeout> | undefined;

  protected componentResolver = computed(() =>
    this.datasetMutator.optimisticActorReady() ? this.components() : undefined,
  );

  protected enableScrollIntoView = computed(() => {
    const state = this.overlayState();
    return (
      !state.isDragging &&
      !state.dragMinimapTransition &&
      !state.dragShowMinimap
    );
  });

  protected documentIds = computed(() =>
    Array.from(this.reportDocuments.getNodeIds(this.overlayState().elements)),
  );

  protected elementsToRender = computed<RenderElement[]>(() => {
    const state = this.overlayState();

    if (
      ((this.inFrame() || this.inPopUp()) &&
        this.comlinkStatus() !== 'connected') ||
      state.isDragging
    ) {
      return [];
    }

    const optimisticActorReady = this.datasetMutator.optimisticActorReady();

    return state.elements
      .filter((element) => element.activated || element.focused)
      .map((element) => {
        const draggable =
          !element.dragDisabled &&
          !!element.element.getAttribute('data-sanity') &&
          optimisticActorReady &&
          state.elements.some((candidate) =>
            'id' in candidate.sanity && 'id' in element.sanity
              ? sanityNodesExistInSameArray(candidate.sanity, element.sanity) &&
                candidate.sanity.path !== element.sanity.path
              : false,
          );

        return { ...element, draggable };
      });
  });

  constructor() {
    effect((onCleanup) => {
      const comlink = this.comlink();

      if (!comlink) {
        return;
      }

      const unsubscribes = [
        comlink.on('presentation/focus', (data) => {
          this.dispatch({ type: 'presentation/focus', data });
        }),
        comlink.on('presentation/blur', (data) => {
          this.dispatch({ type: 'presentation/blur', data });
        }),
        comlink.on('presentation/toggle-overlay', () => {
          this.overlayEnabled.update((enabled) => !enabled);
        }),
      ];

      onCleanup(() => unsubscribes.forEach((unsubscribe) => unsubscribe()));
    });

    effect(() => {
      this.telemetry.comlink.set(this.comlink());
    });

    effect((onCleanup) => {
      if (this.overlayEnabled()) {
        onCleanup(
          raf2(() => {
            this.overlaysFlash.set(true);
            raf2(() => {
              this.fadingOut.set(true);
              this.fadeOutTimeoutRef = setTimeout(() => {
                this.fadingOut.set(false);
                this.overlaysFlash.set(false);
              }, 1500);
            });
          }),
        );
        return;
      }

      clearTimeout(this.fadeOutTimeoutRef);
      this.overlaysFlash.set(false);
      this.fadingOut.set(false);
    });

    effect(() => {
      const state = this.overlayState();
      const comlink = this.comlink();
      this.updateRootHeight();
      this.reportDocuments.report(comlink, state.elements, state.perspective);
      this.schema.reportUnresolvedTypes(state.elements);
    });

    effect((onCleanup) => {
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
        this.overlayEnabled.update((enabled) => !enabled);
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
      window.addEventListener('resize', this.updateRootHeight);

      this.updateRootHeight();

      onCleanup(() => {
        window.removeEventListener('click', handleClick);
        window.removeEventListener('keydown', handleKeydown);
        window.removeEventListener('keyup', handleKeyup);
        window.removeEventListener('resize', this.updateRootHeight);
      });
    });
  }

  protected closeContextMenu(): void {
    this.dispatch({ type: 'overlay/blur' });
  }

  protected dispatch(message: OverlayMsg | VisualEditingControllerMsg): void {
    this.overlayState.update((state) => overlayStateReducer(state, message));
  }

  protected updateDragPreviewCustomProps(x: number, y: number): void {
    const rootElement = this.rootElementRef()?.nativeElement;
    rootElement?.style.setProperty('--drag-preview-x', `${x}px`);
    rootElement?.style.setProperty(
      '--drag-preview-y',
      `${y - window.scrollY}px`,
    );
  }

  private updateRootHeight = (): void => {
    this.rootHeight.set(
      Math.max(
        document.body.scrollHeight,
        document.documentElement.scrollHeight,
        window.innerHeight,
      ),
    );
  };
}
