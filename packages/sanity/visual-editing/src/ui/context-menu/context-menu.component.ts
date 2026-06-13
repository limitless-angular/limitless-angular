import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';

import {
  getContextMenuIcon,
  getContextMenuItems,
  getContextMenuTitle,
  type ContextMenuActionNode,
  type ContextMenuInsertMenuNode,
  type ContextMenuNode,
} from './context-menu-items';
import type {
  SchemaNode,
  SchemaUnionOption,
} from '@sanity/presentation-comlink';
import type { OverlayState } from '../../types';
import { VisualEditingInsertMenuComponent } from '../../overlay-components/components/insert-menu.component';
import { DocumentsService } from '../documents.service';
import { SchemaService } from '../schema/schema.service';
import type { TelemetryEventName } from '../telemetry/telemetry.service';

type ContextMenuState = NonNullable<OverlayState['contextMenu']>;

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-context-menu',
  standalone: true,
  imports: [NgTemplateOutlet, VisualEditingInsertMenuComponent],
  template: `
    <div
      class="menu"
      role="menu"
      tabindex="-1"
      [attr.aria-label]="title()"
      [style.left.px]="left()"
      [style.top.px]="top()"
      (click)="$event.stopPropagation()"
      (contextmenu)="handleContextMenu($event)"
      (keydown)="$event.stopPropagation()"
      #menu
    >
      <div class="header">
        @let icon = titleIcon();
        <span class="icon" [attr.aria-label]="icon.label">
          @if (icon.html) {
            <span [innerHTML]="icon.html"></span>
          } @else {
            {{ icon.text }}
          }
        </span>
        <span class="title">{{ title() }}</span>
      </div>
      @if (items(); as items) {
        @if (items.length) {
          @for (item of items; track $index) {
            <ng-container
              [ngTemplateOutlet]="itemTemplate"
              [ngTemplateOutletContext]="{ item: item }"
            />
          }
        } @else {
          <div class="empty">No actions</div>
        }
      } @else {
        <div class="empty">Loading...</div>
      }
    </div>

    <ng-template #itemTemplate let-item="item">
      @switch (item.type) {
        @case ('divider') {
          <div class="divider" role="separator"></div>
        }
        @case ('group') {
          <div>
            <div class="group-label">
              @if (item.icon; as icon) {
                <span class="icon" [attr.aria-label]="icon.label">
                  @if (icon.html) {
                    <span [innerHTML]="icon.html"></span>
                  } @else {
                    {{ icon.text }}
                  }
                </span>
              }
              <span>{{ item.label }}</span>
            </div>
            @for (child of item.items; track $index) {
              <ng-container
                [ngTemplateOutlet]="itemTemplate"
                [ngTemplateOutletContext]="{ item: child }"
              />
            }
          </div>
        }
        @case ('action') {
          <button
            class="item"
            role="menuitem"
            type="button"
            [disabled]="!item.action"
            (click)="handleAction($event, item)"
          >
            @if (item.icon; as icon) {
              <span class="icon" [attr.aria-label]="icon.label">
                @if (icon.html) {
                  <span [innerHTML]="icon.html"></span>
                } @else {
                  {{ icon.text }}
                }
              </span>
            }
            <span>{{ item.label }}</span>
          </button>
        }
        @case ('insert-menu') {
          <div class="submenu-host">
            <button class="item submenu-trigger" type="button">
              @if (item.icon; as icon) {
                <span class="icon" [attr.aria-label]="icon.label">
                  @if (icon.html) {
                    <span [innerHTML]="icon.html"></span>
                  } @else {
                    {{ icon.text }}
                  }
                </span>
              }
              <span>{{ item.label }}</span>
            </button>
            <div class="submenu">
              <sanity-visual-editing-insert-menu
                [node]="item.parent"
                (optionSelected)="handleInsertMenuSelect($event, item)"
              />
            </div>
          </div>
        }
      }
    </ng-template>
  `,
  styles: `
    .menu {
      background: #fff;
      border: 1px solid rgba(31, 41, 55, 0.12);
      border-radius: 6px;
      box-shadow:
        0 20px 48px rgba(31, 41, 55, 0.22),
        0 2px 8px rgba(31, 41, 55, 0.12);
      color: #1f2937;
      font-family:
        Inter,
        system-ui,
        -apple-system,
        BlinkMacSystemFont,
        sans-serif;
      font-size: 13px;
      line-height: 18px;
      max-height: min(440px, calc(100vh - 16px));
      max-width: 220px;
      min-width: 140px;
      overflow: auto;
      pointer-events: all;
      position: fixed;
      z-index: 9999999;
    }

    .header {
      align-items: center;
      border-bottom: 1px solid rgba(31, 41, 55, 0.08);
      display: flex;
      gap: 8px;
      font-weight: 600;
      overflow: hidden;
      padding: 8px 10px;
    }

    .title {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      color: #6b7280;
      padding: 8px 10px;
    }

    .divider {
      border-top: 1px solid rgba(31, 41, 55, 0.08);
      margin: 4px 0;
    }

    .group-label {
      align-items: center;
      color: #6b7280;
      display: flex;
      font-size: 11px;
      font-weight: 700;
      gap: 8px;
      letter-spacing: 0;
      padding: 7px 10px 3px;
      text-transform: uppercase;
    }

    .item {
      background: transparent;
      border: 0;
      box-sizing: border-box;
      color: #1f2937;
      cursor: pointer;
      display: flex;
      gap: 8px;
      font: inherit;
      padding: 7px 10px;
      text-align: left;
      width: 100%;
    }

    .icon {
      align-items: center;
      background: #f3f4f6;
      border-radius: 4px;
      color: #374151;
      display: inline-flex;
      flex: none;
      font-size: 9px;
      font-weight: 700;
      height: 20px;
      justify-content: center;
      line-height: 1;
      overflow: hidden;
      width: 28px;
    }

    .submenu-host {
      position: relative;
    }

    .submenu-trigger::after {
      content: '>';
      margin-left: auto;
    }

    .submenu {
      background: #fff;
      border: 1px solid rgba(31, 41, 55, 0.12);
      border-radius: 6px;
      box-shadow:
        0 20px 48px rgba(31, 41, 55, 0.22),
        0 2px 8px rgba(31, 41, 55, 0.12);
      display: none;
      left: calc(100% - 4px);
      overflow: hidden;
      position: absolute;
      top: 0;
      z-index: 1;
    }

    .submenu-host:hover .submenu,
    .submenu-host:focus-within .submenu {
      display: block;
    }

    .item:hover:not(:disabled) {
      background: rgba(85, 107, 252, 0.08);
    }

    .item:disabled {
      color: #9ca3af;
      cursor: default;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContextMenuComponent {
  contextMenu = input.required<ContextMenuState>();

  dismiss = output<void>();
  telemetry = output<TelemetryEventName>();

  protected items = signal<ContextMenuNode[] | undefined>(undefined);
  protected left = signal(8);
  protected top = signal(8);

  private menu = viewChild<ElementRef<HTMLElement>>('menu');
  private documents = inject(DocumentsService);
  private schema = inject(SchemaService);

  protected title = computed(() => {
    const schema = this.schema.context();
    const { field } = schema.getField(this.contextMenu().node);
    return getContextMenuTitle(field);
  });

  protected titleIcon = computed(() => {
    const schema = this.schema.context();
    const { field } = schema.getField(this.contextMenu().node);
    return getContextMenuIcon(field);
  });

  constructor() {
    effect((onCleanup) => {
      const contextMenu = this.contextMenu();
      const schema = this.schema.context();
      const { field, parent } = schema.getField(contextMenu.node);
      let disposed = false;

      this.items.set(undefined);
      Promise.resolve(
        getContextMenuItems({
          doc: this.documents.getDocument(contextMenu.node.id),
          field,
          node: contextMenu.node,
          parent,
        }),
      )
        .then((items) => {
          if (!disposed) {
            this.items.set(items);
          }
        })
        .catch((error) => {
          if (!disposed) {
            console.warn(
              '[@limitless-angular/sanity] Failed to render visual editing context menu.',
              error,
            );
            this.items.set([]);
          }
        });

      onCleanup(() => {
        disposed = true;
      });
    });

    effect((onCleanup) => {
      const contextMenu = this.contextMenu();
      const menu = this.menu()?.nativeElement;

      this.left.set(Math.max(8, contextMenu.position.x));
      this.top.set(Math.max(8, contextMenu.position.y));

      if (!menu) {
        return;
      }

      const animationFrame = requestAnimationFrame(() => {
        const rect = menu.getBoundingClientRect();
        this.left.set(
          Math.max(
            8,
            Math.min(
              contextMenu.position.x,
              window.innerWidth - rect.width - 8,
            ),
          ),
        );
        this.top.set(
          Math.max(
            8,
            Math.min(
              contextMenu.position.y,
              window.innerHeight - rect.height - 8,
            ),
          ),
        );
      });

      onCleanup(() => cancelAnimationFrame(animationFrame));
    });
  }

  protected handleContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
  }

  protected handleAction(event: MouseEvent, item: ContextMenuActionNode): void {
    event.preventDefault();
    event.stopPropagation();

    if (!item.action) {
      return;
    }

    item.action();
    this.telemetry.emit(item.telemetryEvent);
    this.dismiss.emit();
  }

  protected handleInsertMenuSelect(
    schemaType: SchemaUnionOption<SchemaNode>,
    item: ContextMenuInsertMenuNode,
  ): void {
    item.action(schemaType);
    this.telemetry.emit(item.telemetryEvent);
    this.dismiss.emit();
  }
}
