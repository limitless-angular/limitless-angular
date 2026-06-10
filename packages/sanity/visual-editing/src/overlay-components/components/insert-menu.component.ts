import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  signal,
} from '@angular/core';
import type {
  SchemaNode,
  SchemaUnionNode,
  SchemaUnionOption,
} from '@sanity/presentation-comlink';

import { getNodeIcon } from '../../util/get-node-icon';

type InsertMenuView = {
  name?: string;
  previewImageUrls?: Record<string, string | undefined>;
};

type InsertMenuOptions = {
  views?: InsertMenuView[];
};

function isSchemaUnionOption(
  node: SchemaUnionNode<SchemaNode>['of'][number],
): node is SchemaUnionOption<SchemaNode> {
  return node.type === 'unionOption';
}

function getSchemaTypeLabel(node: SchemaUnionOption<SchemaNode>): string {
  return node.name === 'block' ? 'Paragraph' : node.title || node.name;
}

function getInsertMenuOptions(
  node: SchemaUnionNode<SchemaNode>,
): InsertMenuOptions {
  return (node.options?.insertMenu ?? {}) as InsertMenuOptions;
}

@Component({
  // eslint-disable-next-line @angular-eslint/component-selector
  selector: 'sanity-visual-editing-insert-menu',
  standalone: true,
  template: `
    <div class="insert-menu">
      <div class="toolbar">
        <input
          class="filter"
          type="search"
          placeholder="Filter types..."
          [value]="query()"
          (input)="setQuery($event)"
        />
        @if (hasGridView()) {
          <button
            class="view-toggle"
            type="button"
            [attr.aria-pressed]="view() === 'grid'"
            (click)="toggleView()"
          >
            {{ view() === 'grid' ? 'List' : 'Grid' }}
          </button>
        }
      </div>

      @if (filteredTypes().length) {
        <div class="items" [attr.data-view]="view()">
          @for (schemaType of filteredTypes(); track schemaType.name) {
            <button
              class="item"
              type="button"
              (click)="select.emit(schemaType)"
            >
              @if (previewImageUrl(schemaType); as previewImage) {
                <img class="preview-image" [src]="previewImage" alt="" />
              } @else {
                @let icon = iconFor(schemaType);
                <span class="icon" [attr.aria-label]="icon.label">
                  @if (icon.html) {
                    <span [innerHTML]="icon.html"></span>
                  } @else {
                    {{ icon.text }}
                  }
                </span>
              }
              <span class="label">{{ labelFor(schemaType) }}</span>
            </button>
          }
        </div>
      } @else {
        <div class="empty">No results</div>
      }
    </div>
  `,
  styles: `
    .insert-menu {
      background: #fff;
      color: #1f2937;
      min-width: 180px;
      max-width: min(340px, calc(100vw - 32px));
      padding: 6px;
      pointer-events: all;
    }

    .toolbar {
      display: flex;
      gap: 6px;
      margin-bottom: 6px;
    }

    .filter {
      border: 1px solid rgba(31, 41, 55, 0.16);
      border-radius: 4px;
      box-sizing: border-box;
      color: inherit;
      flex: 1;
      font: inherit;
      min-width: 0;
      padding: 5px 7px;
    }

    .view-toggle,
    .item {
      background: transparent;
      border: 0;
      color: inherit;
      cursor: pointer;
      font: inherit;
    }

    .view-toggle {
      border: 1px solid rgba(31, 41, 55, 0.16);
      border-radius: 4px;
      padding: 5px 7px;
    }

    .items {
      display: grid;
      gap: 2px;
      max-height: min(360px, calc(100vh - 96px));
      overflow: auto;
    }

    .items[data-view='grid'] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px;
    }

    .item {
      align-items: center;
      border-radius: 4px;
      display: flex;
      gap: 8px;
      min-width: 0;
      padding: 6px;
      text-align: left;
    }

    .items[data-view='grid'] .item {
      align-items: stretch;
      flex-direction: column;
    }

    .item:hover {
      background: rgba(85, 107, 252, 0.08);
    }

    .icon {
      align-items: center;
      background: #f3f4f6;
      border-radius: 4px;
      color: #374151;
      display: inline-flex;
      flex: none;
      font-size: 10px;
      font-weight: 700;
      height: 24px;
      justify-content: center;
      line-height: 1;
      overflow: hidden;
      width: 32px;
    }

    .preview-image {
      aspect-ratio: 4 / 3;
      background: #f3f4f6;
      border-radius: 4px;
      object-fit: cover;
      width: 100%;
    }

    .label {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      color: #6b7280;
      padding: 8px;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VisualEditingInsertMenuComponent {
  node = input.required<SchemaUnionNode<SchemaNode>>();

  select = output<SchemaUnionOption<SchemaNode>>();

  protected query = signal('');
  protected view = signal<'grid' | 'list'>('list');

  protected schemaTypes = computed(() =>
    this.node().of.filter(isSchemaUnionOption),
  );

  protected hasGridView = computed(() =>
    getInsertMenuOptions(this.node()).views?.some(
      (view) => view.name === 'grid',
    ),
  );

  protected filteredTypes = computed(() => {
    const query = this.query().trim().toLowerCase();
    const schemaTypes = this.schemaTypes();

    if (!query) {
      return schemaTypes;
    }

    return schemaTypes.filter((schemaType) =>
      getSchemaTypeLabel(schemaType).toLowerCase().includes(query),
    );
  });

  protected iconFor(schemaType: SchemaUnionOption<SchemaNode>) {
    return getNodeIcon(schemaType);
  }

  protected labelFor(schemaType: SchemaUnionOption<SchemaNode>): string {
    return getSchemaTypeLabel(schemaType);
  }

  protected previewImageUrl(
    schemaType: SchemaUnionOption<SchemaNode>,
  ): string | undefined {
    const gridView = getInsertMenuOptions(this.node()).views?.find(
      (view) => view.name === 'grid',
    );

    return gridView?.previewImageUrls?.[schemaType.name];
  }

  protected setQuery(event: Event): void {
    this.query.set((event.target as HTMLInputElement | null)?.value ?? '');
  }

  protected toggleView(): void {
    this.view.update((view) => (view === 'grid' ? 'list' : 'grid'));
  }
}
