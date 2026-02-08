import type {StructureResolver} from 'sanity/structure'

const SINGLETON_TYPES = new Set(['siteContent', 'siteSettings'])

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .id('site-content')
        .title('Site Content')
        .child(
          S.document()
            .schemaType('siteContent')
            .documentId('siteContent')
            .title('Site Content')
        ),
      S.listItem()
        .id('site-settings')
        .title('Site Settings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings')
        ),
      S.divider(),
      ...S.documentTypeListItems().filter((item) => {
        const itemId = item.getId()
        return itemId ? !SINGLETON_TYPES.has(itemId) : true
      }),
    ])
