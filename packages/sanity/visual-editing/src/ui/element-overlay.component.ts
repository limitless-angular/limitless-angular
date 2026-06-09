import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EnvironmentInjector,
  Injector,
  ViewContainerRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { createEditUrl, studioPath } from '@sanity/client/csm';
import { pathToUrlString } from '@sanity/visual-editing-csm';

import { VisualEditingPointerEventsComponent } from '../overlay-components/components/pointer-events.component';
import type {
  AngularOverlayComponent,
  AngularOverlayComponentDefinition,
  AngularOverlayComponentResolver,
  ElementFocusedState,
  ElementNode,
  OverlayComponentResolverContext,
  OverlayRect,
  SanityNode,
  SanityStegaNode,
} from '../types';
import { getLinkHref } from '../util/get-link-href';
import { PreviewSnapshotsService } from './preview/preview-snapshots.service';
import { SchemaService } from './schema/schema.service';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
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
  value: ReturnType<NonNullable<AngularOverlayComponentResolver>>,
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

type AngularComponentWithInputMetadata = AngularOverlayComponent & {
  ɵcmp?: {
    inputs?: Record<string, unknown>;
  };
};

function hasDeclaredInput(
  component: AngularOverlayComponent,
  input: string,
): boolean {
  const inputMetadata = (component as AngularComponentWithInputMetadata).ɵcmp
    ?.inputs;

  return !!inputMetadata && input in inputMetadata;
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

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-element-overlay',
  standalone: true,
  template: `
    <div
      class="root"
      [attr.data-focused]="focused() ? '' : null"
      [attr.data-hovered]="hovered() ? '' : null"
      [attr.data-flipped]="isNearTop() ? '' : null"
      [attr.data-draggable]="draggable() ? '' : null"
      [style.width.px]="rect().w"
      [style.height.px]="rect().h"
      [style.transform]="transform()"
      #overlayElement
    >
      @if (hovered()) {
        @if (showActions()) {
          <div class="actions" data-sanity-overlay-element>
            <a [href]="linkHref()" target="_blank" rel="noopener noreferrer">
              Open in Studio
            </a>
          </div>
        }

        @if (title(); as title) {
          <div class="tab">
            <div class="labels">
              @if (draggable()) {
                <span class="drag-handle" aria-hidden="true">::::</span>
              }
              @if (typeIcon(); as icon) {
                <span
                  class="type-icon"
                  aria-hidden="true"
                  [innerHTML]="icon"
                ></span>
              }
              <span>{{ title }}</span>
            </div>
          </div>
        }

        <div class="custom-components">
          <ng-container #customComponents />
          <span #customDomHost></span>
        </div>
      }
    </div>
  `,
  styles: `
    .root {
      background-color: var(--overlay-bg);
      border-radius: 3px;
      box-shadow: var(--overlay-box-shadow);
      pointer-events: none;
      position: absolute;
      transition: none;
      will-change: transform;

      --overlay-bg: transparent;
      --overlay-box-shadow: inset 0 0 0 1px transparent;
    }

    :host-context([data-overlays]) .root {
      --overlay-bg: color-mix(
        in srgb,
        transparent 95%,
        var(--card-focus-ring-color, rgb(85, 140, 255))
      );
      --overlay-box-shadow: inset 0 0 0 2px
        color-mix(
          in srgb,
          transparent 50%,
          var(--card-focus-ring-color, rgb(85, 140, 255))
        );
    }

    :host-context([data-fading-out]) .root {
      transition:
        box-shadow 1550ms,
        background-color 1550ms;

      --overlay-bg: rgba(0, 0, 255, 0);
      --overlay-box-shadow: inset 0 0 0 1px transparent;
    }

    .root[data-focused] {
      --overlay-box-shadow: inset 0 0 0 1px
        var(--card-focus-ring-color, rgb(85, 140, 255));
    }

    .root[data-hovered]:not([data-focused]) {
      transition: none;
      --overlay-box-shadow: inset 0 0 0 2px
        var(--card-focus-ring-color, rgb(85, 140, 255));
    }

    .actions,
    .tab {
      bottom: 100%;
      cursor: pointer;
      pointer-events: all;
      position: absolute;
    }

    .actions {
      right: 0;
    }

    .tab {
      left: 0;
    }

    .root[data-flipped] .actions,
    .root[data-flipped] .tab {
      bottom: auto;
      top: 100%;
    }

    .actions a,
    .labels {
      background-color: var(--card-focus-ring-color, rgb(85, 140, 255));
      border-radius: 3px;
      color: #fff;
      display: block;
      font-family:
        Inter,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
      font-size: 12px;
      font-weight: 600;
      line-height: 16px;
      padding: 4px 8px;
      text-decoration: none;
      white-space: nowrap;
    }

    .labels {
      align-items: center;
      display: flex;
      gap: 8px;
      max-width: min(280px, 100vw);
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .drag-handle {
      font-family: monospace;
      letter-spacing: 0;
    }

    .type-icon {
      align-items: center;
      display: inline-flex;
      flex: none;
      height: 14px;
      width: 14px;
    }

    .custom-components {
      pointer-events: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElementOverlayComponent {
  componentResolver = input<AngularOverlayComponentResolver>();
  draggable = input.required<boolean>();
  element = input.required<ElementNode>();
  enableScrollIntoView = input.required<boolean>();
  focused = input.required<ElementFocusedState>();
  hovered = input.required<boolean>();
  isDragging = input.required<boolean>();
  node = input.required<SanityNode | SanityStegaNode>();
  rect = input.required<OverlayRect>();
  showActions = input.required<boolean>();
  wasMaybeCollapsed = input.required<boolean>();

  protected isNearTop = signal(false);
  protected currentHref = signal(window.location.href);

  protected transform = computed(() => {
    const rect = this.rect();
    return `translate(${rect.x}px, ${rect.y}px)`;
  });

  protected title = computed(() => {
    const node = this.node();
    if (!('path' in node)) {
      return undefined;
    }

    return this.previewSnapshots
      .snapshots()
      .find((snapshot) => snapshot._id === node.id)?.title;
  });

  protected linkHref = computed(() => {
    const node = this.node();
    const href = 'path' in node ? createIntentLink(node) : node.href;
    return getLinkHref(href, this.currentHref());
  });

  protected typeIcon = computed(() => {
    const node = this.node();
    if (!('path' in node)) {
      return undefined;
    }

    return this.schema.context().getType(node)?.icon;
  });

  private componentContext = computed<
    OverlayComponentResolverContext | undefined
  >(() => {
    const node = this.node();
    if (!('path' in node)) {
      return undefined;
    }

    const schema = this.schema.context();
    const document = schema.getType(node);
    const { field, parent } = schema.getField(node);

    if (!document || !field) {
      return undefined;
    }

    return {
      document,
      element: this.element(),
      field,
      focused: !!this.focused(),
      node,
      parent,
      type: field.value.type,
    };
  });

  private customComponents = viewChild('customComponents', {
    read: ViewContainerRef,
  });
  private customDomHost = viewChild<ElementRef<HTMLElement>>('customDomHost');
  private overlayElement =
    viewChild<ElementRef<HTMLDivElement>>('overlayElement');
  private environmentInjector = inject(EnvironmentInjector);
  private injector = inject(Injector);
  private previewSnapshots = inject(PreviewSnapshotsService);
  private schema = inject(SchemaService);
  private scrolledIntoView = false;

  constructor() {
    effect((onCleanup) => {
      const handlePopState = () => {
        this.currentHref.set(window.location.href);
      };

      window.addEventListener('popstate', handlePopState);

      onCleanup(() => {
        window.removeEventListener('popstate', handlePopState);
      });
    });

    effect((onCleanup) => {
      const overlayElement = this.overlayElement()?.nativeElement;
      const hovered = this.hovered();

      if (!overlayElement || !hovered) {
        this.isNearTop.set(false);
        return;
      }

      const observer = new IntersectionObserver(
        ([intersection]) => {
          this.isNearTop.set(intersection.boundingClientRect.top < 0);
        },
        { threshold: 1 },
      );
      observer.observe(overlayElement);

      onCleanup(() => observer.disconnect());
    });

    effect(() => {
      const overlayElement = this.overlayElement()?.nativeElement;
      const focused = this.focused() === true;

      if (
        overlayElement &&
        !this.scrolledIntoView &&
        !this.wasMaybeCollapsed() &&
        focused &&
        this.enableScrollIntoView()
      ) {
        overlayElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest',
        });
      }

      this.scrolledIntoView = focused;
    });

    effect((onCleanup) => {
      const viewContainer = this.customComponents();
      const domHost = this.customDomHost()?.nativeElement;
      const context = this.componentContext();
      const resolver = this.componentResolver();

      viewContainer?.clear();
      domHost?.replaceChildren();

      if (
        !viewContainer ||
        !domHost ||
        !context ||
        !resolver ||
        !this.hovered()
      ) {
        return;
      }

      const resolvedComponents = untracked(() => resolver(context));
      const definitions = normalizeComponentDefinitions(resolvedComponents);

      for (const definition of definitions) {
        if (isDomNode(definition)) {
          domHost.appendChild(definition);
          continue;
        }

        const componentRef = viewContainer.createComponent(
          definition.component,
          {
            environmentInjector: this.environmentInjector,
            injector: this.injector,
          },
        );
        const values = {
          ...context,
          ...(definition.props ?? {}),
          ...(definition.inputs ?? {}),
          PointerEvents: VisualEditingPointerEventsComponent,
        };

        for (const [key, value] of Object.entries(values)) {
          if (hasDeclaredInput(definition.component, key)) {
            componentRef.setInput(key, value);
          } else {
            Reflect.set(componentRef.instance as object, key, value);
          }
        }
      }

      onCleanup(() => {
        viewContainer.clear();
        domHost.replaceChildren();
      });
    });
  }
}
