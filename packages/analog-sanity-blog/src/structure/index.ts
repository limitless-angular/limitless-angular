import type { StructureResolver } from 'sanity/structure';

export const blogStructure: StructureResolver = (S) =>
  S.list()
    .title('Blog')
    .items([
      S.documentListItem()
        .id('settings')
        .schemaType('settings')
        .title('Settings'),
      S.divider(),
      S.documentTypeListItem('post').title('Posts'),
      S.documentTypeListItem('author').title('Authors'),
    ]);
