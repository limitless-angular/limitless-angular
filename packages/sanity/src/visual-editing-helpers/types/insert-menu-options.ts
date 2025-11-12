/**
 * @alpha This API may change
 * Based on the [@sanity/insert-menu v1.0.11](https://github.com/sanity-io/visual-editing/blob/main/packages/insert-menu/src/InsertMenuOptions.ts) package.
 * */
export interface InsertMenuOptions {
  /**
   * @defaultValue `'auto'`
   * `filter: 'auto'` automatically turns on filtering if there are more than 5
   * schema types added to the menu.
   */
  filter?: 'auto' | boolean;
  groups?: Array<{ name: string; title?: string; of?: Array<string> }>;
  /** defaultValue `true` */
  showIcons?: boolean;
  /** @defaultValue `[{name: 'list'}]` */
  views?: Array<
    | { name: 'list' }
    | {
        name: 'grid';
        previewImageUrl?: (schemaTypeName: string) => string | undefined;
      }
  >;
}
