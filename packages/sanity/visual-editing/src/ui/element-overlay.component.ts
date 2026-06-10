import {
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
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
  ElementChildTarget,
  ElementFocusedState,
  ElementNode,
  OverlayComponentResolverContext,
  OverlayPluginComponent,
  OverlayPluginDefinition,
  OverlayPluginExclusiveDefinition,
  OverlayPluginHudDefinition,
  OverlayRect,
  SanityNode,
  SanityStegaNode,
  VisualEditingNode,
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

type OverlayComponentType = AngularOverlayComponent | OverlayPluginComponent;

type AngularComponentWithInputMetadata = OverlayComponentType & {
  ɵcmp?: {
    inputs?: Record<string, unknown>;
  };
};

function hasDeclaredInput(
  component: OverlayComponentType,
  input: string,
): boolean {
  const inputMetadata = (component as AngularComponentWithInputMetadata).ɵcmp
    ?.inputs;

  return !!inputMetadata && input in inputMetadata;
}

interface NodePluginCollection {
  id: string;
  context: OverlayComponentResolverContext;
  hud: OverlayPluginHudDefinition[];
  exclusive: OverlayPluginExclusiveDefinition[];
}

interface ActiveExclusivePlugin {
  plugin: OverlayPluginExclusiveDefinition;
  context: OverlayComponentResolverContext;
}

type SanityNodeWithPerspective = SanityNode & {
  perspective?: string;
};

function createIntentLink(node: SanityNode): string {
  const { baseUrl, id, path, perspective, tool, type, workspace } =
    node as SanityNodeWithPerspective;

  const [url, search] = createEditUrl({
    baseUrl,
    id,
    path: path ? pathToUrlString(studioPath.fromString(path)) : [],
    tool,
    type: type ?? '',
    workspace,
  }).split('?');
  const searchParams = new URLSearchParams(search);
  const resolvedPerspective = perspective || searchParams.get('perspective');

  if (resolvedPerspective === 'drafts') {
    searchParams.delete('perspective');
  } else if (resolvedPerspective) {
    searchParams.set('perspective', resolvedPerspective);
  }

  return `${url}?${searchParams}`;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-element-overlay',
  standalone: true,
  imports: [VisualEditingPointerEventsComponent],
  template: `
    @if (menuOpen() || activeExclusivePlugin()) {
      <button
        type="button"
        class="popover-background"
        data-sanity-overlay-element
        aria-label="Close overlay menu"
        [attr.data-block-scroll]="menuOpen() ? '' : null"
        (click)="$event.stopPropagation()"
        (mousedown)="closeExclusivePluginView()"
      ></button>
    }

    <div
      class="root"
      [attr.data-focused]="focused() ? '' : null"
      [attr.data-hovered]="hovered() ? '' : null"
      [attr.data-flipped]="isNearTop() ? '' : null"
      [attr.data-draggable]="draggable() ? '' : null"
      [attr.data-menu-open]="menuOpen() ? '' : null"
      [style.width.px]="rect().w"
      [style.height.px]="rect().h"
      [style.transform]="transform()"
      #overlayElement
    >
      @if (activeExclusivePlugin()) {
        <div
          class="exclusive-plugin-container"
          data-sanity-overlay-element
          tabindex="-1"
          (click)="$event.stopPropagation()"
          (keydown)="$event.stopPropagation()"
        >
          <ng-container #exclusivePluginHost />
        </div>
      } @else if (hovered()) {
        <sanity-visual-editing-pointer-events>
          @if (showActions()) {
            <div class="actions">
              <a
                [href]="linkHref()"
                [attr.target]="inFrame() ? null : '_blank'"
                [attr.rel]="inFrame() ? 'noopener' : 'noopener noreferrer'"
              >
                Open in Studio
              </a>
            </div>
          }

          @if (title() || showPluginMenu()) {
            <div
              class="tab"
              role="button"
              tabindex="0"
              (click)="handleLabelClick()"
              (keydown.enter)="handleLabelClick()"
              (keydown.space)="handleLabelClick(); $event.preventDefault()"
            >
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
                @if (title(); as title) {
                  <span>{{ title }}</span>
                }
                @if (showPluginMenu()) {
                  <span
                    class="menu-wrapper"
                    tabindex="-1"
                    (click)="$event.stopPropagation()"
                    (keydown)="$event.stopPropagation()"
                  >
                    <button
                      type="button"
                      class="menu-button"
                      aria-label="Overlay plugins"
                      (click)="toggleMenu($event)"
                    >
                      ⋮
                    </button>
                    @if (menuOpen()) {
                      <div class="plugin-menu" data-sanity-overlay-element>
                        @for (
                          collection of pluginCollections();
                          track collection.id
                        ) {
                          <div class="plugin-menu-group">
                            <button
                              type="button"
                              class="plugin-menu-item muted"
                              (click)="focusPluginContext(collection.context)"
                            >
                              {{
                                collection.context.document.name +
                                  ': ' +
                                  collection.context.field?.name
                              }}
                            </button>
                            @for (
                              exclusive of collection.exclusive;
                              track exclusive.name
                            ) {
                              @if (exclusive.component) {
                                <button
                                  type="button"
                                  class="plugin-menu-item"
                                  (click)="
                                    activateExclusivePlugin(
                                      exclusive,
                                      collection.context
                                    )
                                  "
                                >
                                  {{ exclusive.title || exclusive.name }}
                                </button>
                              }
                            }
                          </div>
                        }
                      </div>
                    }
                  </span>
                }
              </div>
            </div>
          }

          <div class="hud-components">
            <ng-container #hudComponents />
          </div>
        </sanity-visual-editing-pointer-events>

        <div class="custom-components">
          <ng-container #customComponents />
          <span #customDomHost></span>
        </div>
      }
    </div>
  `,
  styles: `
    .popover-background {
      appearance: none;
      background: transparent;
      border: 0;
      height: 100%;
      inset: 0;
      padding: 0;
      pointer-events: all;
      position: fixed;
      width: 100%;
    }

    .popover-background[data-block-scroll] {
      -ms-overflow-style: none;
      overscroll-behavior: contain;
      overflow-y: scroll;
      scrollbar-width: none;
    }

    .popover-background[data-block-scroll]::before {
      content: '';
      display: block;
      height: calc(100% + 1px);
      position: absolute;
      top: 0;
      width: 100%;
      z-index: -1;
    }

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
    .tab,
    .hud-components {
      cursor: pointer;
      pointer-events: none;
      position: absolute;
    }

    .actions {
      bottom: 100%;
      right: 0;
    }

    .tab {
      bottom: 100%;
      left: 0;
    }

    .hud-components {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      left: 0;
      padding: 4px 0;
      top: 100%;
    }

    .root[data-hovered]:not([data-menu-open]) .actions,
    .root[data-hovered]:not([data-menu-open]) .tab,
    .root[data-hovered]:not([data-menu-open]) .hud-components,
    .root[data-menu-open] .tab,
    .menu-wrapper,
    .plugin-menu,
    .exclusive-plugin-container {
      pointer-events: all;
    }

    .root[data-flipped] .actions,
    .root[data-flipped] .tab {
      bottom: auto;
      top: 100%;
    }

    .root[data-flipped] .hud-components {
      top: calc(100% + 2rem);
    }

    .actions a,
    .labels,
    .plugin-menu-item {
      font-family:
        Inter,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
      font-size: 12px;
      line-height: 16px;
    }

    .actions a,
    .labels {
      background-color: var(--card-focus-ring-color, rgb(85, 140, 255));
      border-radius: 3px;
      color: #fff;
      display: block;
      font-weight: 600;
      padding: 4px 8px;
      text-decoration: none;
      white-space: nowrap;
    }

    .labels {
      align-items: center;
      display: flex;
      gap: 8px;
      max-width: min(280px, 100vw);
      overflow: visible;
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

    .menu-wrapper {
      display: inline-flex;
      margin: -4px;
      padding-left: 4px;
      position: relative;
    }

    .menu-button {
      appearance: none;
      background: transparent;
      border: 0;
      border-radius: 3px;
      color: #fff;
      cursor: pointer;
      font: inherit;
      height: 24px;
      line-height: 20px;
      padding: 0 6px;
    }

    .menu-button:hover {
      background: rgba(255, 255, 255, 0.18);
    }

    .plugin-menu {
      background: #fff;
      border-radius: 3px;
      box-shadow:
        0 12px 32px rgba(0, 0, 0, 0.18),
        0 0 0 1px rgba(0, 0, 0, 0.08);
      color: #101112;
      left: 0;
      min-width: 220px;
      padding: 4px 0;
      position: absolute;
      top: calc(100% + 4px);
      z-index: 1;
    }

    .plugin-menu-group + .plugin-menu-group {
      border-top: 1px solid rgba(0, 0, 0, 0.08);
      margin-top: 4px;
      padding-top: 4px;
    }

    .plugin-menu-item {
      appearance: none;
      background: transparent;
      border: 0;
      color: inherit;
      cursor: pointer;
      display: block;
      padding: 8px 12px;
      text-align: left;
      width: 100%;
    }

    .plugin-menu-item:hover {
      background: rgba(0, 0, 0, 0.06);
    }

    .plugin-menu-item.muted {
      color: rgba(0, 0, 0, 0.62);
      text-transform: capitalize;
    }

    .exclusive-plugin-container {
      inset: 0;
      position: absolute;
    }

    .custom-components {
      pointer-events: none;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElementOverlayComponent {
  id = input.required<string>();
  comlink = input<VisualEditingNode>();
  componentResolver = input<AngularOverlayComponentResolver>();
  draggable = input.required<boolean>();
  element = input.required<ElementNode>();
  elementType = input.required<'element' | 'group'>();
  inFrame = input.required<boolean>();
  enableScrollIntoView = input.required<boolean>();
  focused = input.required<ElementFocusedState>();
  hovered = input.required<boolean>();
  isDragging = input.required<boolean>();
  node = input.required<SanityNode | SanityStegaNode>();
  plugins = input<OverlayPluginDefinition[]>();
  rect = input.required<OverlayRect>();
  showActions = input.required<boolean>();
  targets = input.required<ElementChildTarget[]>();
  wasMaybeCollapsed = input.required<boolean>();

  protected isNearTop = signal(false);
  protected currentHref = signal(window.location.href);
  protected menuOpen = signal(false);
  protected activeExclusivePlugin = signal<ActiveExclusivePlugin | undefined>(
    undefined,
  );

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

  protected pluginCollections = computed<NodePluginCollection[]>(() =>
    this.targets()
      .map((target) =>
        this.createComponentContext(target.sanity, target.element),
      )
      .filter((context): context is OverlayComponentResolverContext =>
        Boolean(context),
      )
      .map((context, index) => {
        const collection: NodePluginCollection = {
          id: `${context.node.id}:${context.node.path}:${index}`,
          context,
          hud: [],
          exclusive: [],
        };

        for (const plugin of this.plugins() ?? []) {
          if (!plugin.guard?.(context)) continue;

          if (plugin.type === 'hud') {
            collection.hud.push(plugin);
          }

          if (plugin.type === 'exclusive') {
            collection.exclusive.push(plugin);
          }
        }

        return collection;
      }),
  );

  protected showPluginMenu = computed(() => {
    const collections = this.pluginCollections();
    return (
      collections.some((collection) => collection.exclusive.length > 0) ||
      collections.length > 1
    );
  });

  private legacyComponentContext = computed<
    OverlayComponentResolverContext | undefined
  >(() => {
    if (this.elementType() !== 'element') {
      return undefined;
    }

    return this.createComponentContext(this.node());
  });

  private customComponents = viewChild('customComponents', {
    read: ViewContainerRef,
  });
  private hudComponents = viewChild('hudComponents', {
    read: ViewContainerRef,
  });
  private exclusivePluginHost = viewChild('exclusivePluginHost', {
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

  protected handleLabelClick(): void {
    window.dispatchEvent(
      new CustomEvent('sanity-overlay/label-click', {
        detail: { id: this.id() },
      }),
    );
  }

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  protected focusPluginContext(context: OverlayComponentResolverContext): void {
    this.comlink()?.post('visual-editing/focus', context.node);
  }

  protected activateExclusivePlugin(
    plugin: OverlayPluginExclusiveDefinition,
    context: OverlayComponentResolverContext,
  ): void {
    this.menuOpen.set(false);
    this.activeExclusivePlugin.set({ plugin, context });
  }

  protected closeExclusivePluginView(): void {
    this.menuOpen.set(false);
    this.activeExclusivePlugin.set(undefined);
    window.dispatchEvent(
      new CustomEvent('sanity-overlay/exclusive-plugin-closed'),
    );
  }

  private createComponentContext(
    node: SanityNode | SanityStegaNode,
    targetElement = this.element(),
  ): OverlayComponentResolverContext | undefined {
    if (!('id' in node)) {
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
      targetElement,
      field,
      focused: !!this.focused(),
      node: node as SanityNode,
      parent,
      type: field.value.type,
    };
  }

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

    effect(() => {
      if (!this.hovered()) {
        this.menuOpen.set(false);
      }
    });

    effect((onCleanup) => {
      const viewContainer = this.customComponents();
      const domHost = this.customDomHost()?.nativeElement;
      const context = this.legacyComponentContext();
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

        this.setComponentValues(componentRef, definition.component, values);
      }

      onCleanup(() => {
        viewContainer.clear();
        domHost.replaceChildren();
      });
    });

    effect((onCleanup) => {
      const viewContainer = this.hudComponents();
      const collections = this.pluginCollections();
      const activeExclusivePlugin = this.activeExclusivePlugin();

      viewContainer?.clear();

      if (!viewContainer || !this.hovered() || activeExclusivePlugin) {
        return;
      }

      for (const collection of collections) {
        for (const hud of collection.hud) {
          if (!hud.component) {
            continue;
          }

          const componentRef = viewContainer.createComponent(hud.component, {
            environmentInjector: this.environmentInjector,
            injector: this.injector,
          });
          this.setComponentValues(componentRef, hud.component, {
            ...collection.context,
          });
        }
      }

      onCleanup(() => viewContainer.clear());
    });

    effect((onCleanup) => {
      const viewContainer = this.exclusivePluginHost();
      const activeExclusivePlugin = this.activeExclusivePlugin();

      viewContainer?.clear();

      if (
        !viewContainer ||
        !activeExclusivePlugin ||
        !activeExclusivePlugin.plugin.component
      ) {
        return;
      }

      const component = activeExclusivePlugin.plugin.component;
      const componentRef = viewContainer.createComponent(component, {
        environmentInjector: this.environmentInjector,
        injector: this.injector,
      });

      this.setComponentValues(componentRef, component, {
        ...activeExclusivePlugin.context,
        closeExclusiveView: () => this.closeExclusivePluginView(),
      });

      onCleanup(() => viewContainer.clear());
    });
  }

  private setComponentValues(
    componentRef: ComponentRef<unknown>,
    component: OverlayComponentType,
    values: Record<string, unknown>,
  ): void {
    for (const [key, value] of Object.entries(values)) {
      if (hasDeclaredInput(component, key)) {
        componentRef.setInput(key, value);
      } else {
        Reflect.set(componentRef.instance as object, key, value);
      }
    }
  }
}
