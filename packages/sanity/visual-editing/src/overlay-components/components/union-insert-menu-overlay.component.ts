import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import type {
  SchemaNode,
  SchemaUnionNode,
  SchemaUnionOption,
} from '@sanity/presentation-comlink';

import type {
  ElementNode,
  OverlayElementParent,
  SanityNode,
} from '../../types';
import { DocumentsService } from '../../ui/documents.service';
import { TelemetryService } from '../../ui/telemetry/telemetry.service';
import { getArrayInsertPatches } from '../../util/mutations';
import { VisualEditingInsertMenuComponent } from './insert-menu.component';

type InsertPosition = 'bottom' | 'left' | 'right' | 'top';

function isSchemaUnionNode(
  parent: OverlayElementParent,
): parent is SchemaUnionNode<SchemaNode> {
  return parent?.type === 'union';
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-union-insert-menu-overlay',
  imports: [VisualEditingInsertMenuComponent],
  template: `
    @if (unionParent(); as parent) {
      <div class="root" [attr.data-direction]="direction()">
        @for (position of positions(); track position) {
          <div
            class="hover-area"
            data-sanity-overlay-element
            role="button"
            tabindex="0"
            [attr.data-position]="position"
            [style.height]="hoverAreaHeight(position)"
            [style.width]="hoverAreaWidth(position)"
            (click)="relayEventToElement($event)"
            (contextmenu)="relayEventToElement($event)"
            (keydown)="relayKeyboardEventToElement($event)"
            (mousedown)="relayEventToElement($event)"
            (mouseenter)="hoveredPosition.set(position)"
            (mouseleave)="handleMouseLeave(position)"
            (mouseup)="relayEventToElement($event)"
          >
            @if (isButtonVisible(position)) {
              <button
                class="add-button"
                type="button"
                [attr.aria-pressed]="menuPosition() === position"
                (click)="toggleMenu($event, position)"
              >
                +
              </button>
            }

            @if (menuPosition() === position) {
              <div class="popover" [attr.data-position]="position">
                <sanity-visual-editing-insert-menu
                  [node]="parent"
                  (optionSelected)="handleSelect($event, position)"
                />
              </div>
            }
          </div>
        }
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
      height: 100%;
      pointer-events: none;
      width: 100%;
    }

    .root {
      display: flex;
      height: 100%;
      justify-content: space-between;
      pointer-events: none;
      width: 100%;
    }

    .root[data-direction='horizontal'] {
      flex-direction: row;
    }

    .root[data-direction='vertical'] {
      flex-direction: column;
    }

    .hover-area {
      align-items: center;
      display: flex;
      justify-content: center;
      pointer-events: all;
      position: relative;
    }

    .hover-area[data-position='top'] {
      align-items: flex-start;
    }

    .hover-area[data-position='right'] {
      justify-content: flex-end;
    }

    .hover-area[data-position='bottom'] {
      align-items: flex-end;
    }

    .hover-area[data-position='left'] {
      justify-content: flex-start;
    }

    .add-button {
      align-items: center;
      background: #fff;
      border: 1px solid rgba(31, 41, 55, 0.14);
      border-radius: 999px;
      box-shadow: 0 6px 18px rgba(31, 41, 55, 0.18);
      color: #1f2937;
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      font-size: 18px;
      height: 28px;
      justify-content: center;
      line-height: 1;
      pointer-events: all;
      position: relative;
      width: 28px;
      z-index: 2;
    }

    .hover-area[data-position='top'] .add-button {
      transform: translateY(-50%);
    }

    .hover-area[data-position='right'] .add-button {
      transform: translateX(50%);
    }

    .hover-area[data-position='bottom'] .add-button {
      transform: translateY(50%);
    }

    .hover-area[data-position='left'] .add-button {
      transform: translateX(-50%);
    }

    .popover {
      background: #fff;
      border: 1px solid rgba(31, 41, 55, 0.12);
      border-radius: 6px;
      box-shadow:
        0 20px 48px rgba(31, 41, 55, 0.22),
        0 2px 8px rgba(31, 41, 55, 0.12);
      overflow: hidden;
      pointer-events: all;
      position: absolute;
      z-index: 9999999;
    }

    .popover[data-position='top'] {
      bottom: calc(100% + 8px);
      left: 0;
    }

    .popover[data-position='right'] {
      right: calc(100% + 8px);
      top: 0;
    }

    .popover[data-position='bottom'] {
      left: 0;
      top: calc(100% + 8px);
    }

    .popover[data-position='left'] {
      left: calc(100% + 8px);
      top: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualEditingUnionInsertMenuOverlayComponent {
  direction = input<'horizontal' | 'vertical'>('vertical');
  element = input.required<ElementNode>();
  hoverAreaExtent = input<string | number>();
  node = input.required<SanityNode>();
  parent = input<OverlayElementParent>();

  protected hoveredPosition = signal<InsertPosition | undefined>(undefined);
  protected menuPosition = signal<InsertPosition | undefined>(undefined);

  private documents = inject(DocumentsService);
  private telemetry = inject(TelemetryService);

  protected positions = computed<InsertPosition[]>(() =>
    this.direction() === 'horizontal' ? ['left', 'right'] : ['top', 'bottom'],
  );

  protected unionParent = computed(() => {
    const parent = this.parent();
    return isSchemaUnionNode(parent) ? parent : undefined;
  });

  protected handleMouseLeave(position: InsertPosition): void {
    if (this.menuPosition() !== position) {
      this.hoveredPosition.set(undefined);
    }
  }

  protected handleSelect(
    schemaType: SchemaUnionOption<SchemaNode>,
    position: InsertPosition,
  ): void {
    const insertPosition =
      position === 'top' || position === 'left' ? 'before' : 'after';
    const doc = this.documents.getDocument(this.node().id);

    doc.patch(
      getArrayInsertPatches(this.node(), schemaType.name, insertPosition),
    );
    this.telemetry.send('Visual Editing Insert Menu Item Inserted');
    this.menuPosition.set(undefined);
    this.hoveredPosition.set(undefined);
  }

  protected hoverAreaHeight(position: InsertPosition): string {
    if (position === 'top' || position === 'bottom') {
      return this.toCssLength(this.hoverAreaExtent() ?? '48px');
    }

    return '100%';
  }

  protected hoverAreaWidth(position: InsertPosition): string {
    if (position === 'left' || position === 'right') {
      return this.toCssLength(this.hoverAreaExtent() ?? '48px');
    }

    return '100%';
  }

  protected isButtonVisible(position: InsertPosition): boolean {
    return (
      this.hoveredPosition() === position || this.menuPosition() === position
    );
  }

  protected relayEventToElement(event: MouseEvent): void {
    if (event.target !== event.currentTarget) {
      return;
    }

    const newEvent = new MouseEvent(event.type, {
      altKey: event.altKey,
      bubbles: true,
      button: event.button,
      buttons: event.buttons,
      cancelable: true,
      clientX: event.clientX,
      clientY: event.clientY,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      screenX: event.screenX,
      screenY: event.screenY,
      shiftKey: event.shiftKey,
    });

    this.element().dispatchEvent(newEvent);
  }

  protected relayKeyboardEventToElement(event: KeyboardEvent): void {
    if (event.target !== event.currentTarget || event.repeat) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.element().dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  protected toggleMenu(event: MouseEvent, position: InsertPosition): void {
    event.preventDefault();
    event.stopPropagation();
    this.menuPosition.update((current) =>
      current === position ? undefined : position,
    );
  }

  private toCssLength(value: string | number): string {
    return typeof value === 'number' ? `${value}px` : value;
  }
}
