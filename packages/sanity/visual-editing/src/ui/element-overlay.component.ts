import {
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

import { createEditUrl, studioPath } from '@sanity/client/csm';
import type {
  ElementFocusedState,
  OverlayRect,
  SanityNode,
  SanityStegaNode,
} from '@sanity/visual-editing';

// eslint-disable-next-line @nx/enforce-module-boundaries
import { pathToUrlString } from '@repo/visual-editing-helpers';
import scrollIntoView from 'scroll-into-view-if-needed';

function createIntentLink(node: SanityNode) {
  const { id, type, path, baseUrl, tool, workspace } = node;

  return createEditUrl({
    baseUrl,
    workspace,
    tool,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    type: type!,
    id,
    path: pathToUrlString(studioPath.fromString(path)),
  });
}

@Component({
  selector: 'lib-element-overlay',
  standalone: true,
  template: `
    <div
      class="root"
      [class.focused]="focused()"
      [class.hovered]="hovered()"
      [style.width.px]="rect().w"
      [style.height.px]="rect().h"
      [style.transform]="'translate(' + rect().x + 'px, ' + rect().y + 'px)'"
      #overlayElement
    >
      @if (showActions() && hovered()) {
        <div class="actions">
          <a
            [href]="intentLink()"
            target="_blank"
            rel="noopener"
            referrerpolicy="no-referrer-when-downgrade"
          >
            <div class="action-open">
              <span>Open in Studio</span>
            </div>
          </a>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .root {
        background-color: var(--overlay-bg, transparent);
        border-radius: 3px;
        pointer-events: none;
        position: absolute;
        will-change: transform;
        box-shadow: var(--overlay-box-shadow, inset 0 0 0 1px transparent);
        transition: none;
      }
      .focused {
        --overlay-box-shadow: inset 0 0 0 1px var(--card-focus-ring-color);
      }
      .hovered:not(.focused) {
        transition: none;
        --overlay-box-shadow: inset 0 0 0 2px var(--card-focus-ring-color);
      }
      .actions {
        bottom: 100%;
        cursor: pointer;
        pointer-events: all;
        position: absolute;
        right: 0;
      }
      .action-open {
        background-color: var(--card-focus-ring-color);
        right: 0;
        border-radius: 3px;
        padding: 8px;
      }
      .action-open span {
        color: var(--card-bg-color);
        white-space: nowrap;
        font-weight: 500;
        font-size: 14px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ElementOverlayComponent {
  focused = input.required<ElementFocusedState>();
  hovered = input.required<boolean>();
  rect = input.required<OverlayRect>();
  showActions = input.required<boolean>();
  sanity = input.required<SanityNode | SanityStegaNode>();
  wasMaybeCollapsed = input.required<boolean>();

  protected elementRef =
    viewChild.required<ElementRef<HTMLDivElement>>('overlayElement');

  intentLink = computed(() => {
    const node = this.sanity();
    return 'path' in node ? createIntentLink(node) : node.href;
  });

  private scrolledIntoView = signal(false);

  constructor() {
    effect(() => {
      const ref = untracked(this.elementRef);
      if (
        !untracked(this.scrolledIntoView) &&
        !this.wasMaybeCollapsed() &&
        this.focused()
      ) {
        scrollIntoView(ref.nativeElement, {
          // Workaround issue with scroll-into-view-if-needed struggling with iframes
          behavior: (actions) => {
            if (actions.length === 0) {
              // An empty actions list equals scrolling isn't needed
              return;
            }
            // Uses native scrollIntoView to ensure iframes behave correctly
            ref.nativeElement.scrollIntoView({
              behavior: 'smooth',
              block: 'center',
              inline: 'nearest',
            });
          },
          scrollMode: 'if-needed',
          block: 'center',
          inline: 'nearest',
        });

        untracked(() => {
          this.scrolledIntoView.set(true);
        });
      }
    });
  }
}
