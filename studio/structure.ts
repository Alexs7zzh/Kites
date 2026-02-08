import type {StructureResolver} from 'sanity/structure'

const SINGLETON_TYPES = new Set(['siteContent'])

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
      S.divider(),
      ...S.documentTypeListItems().filter((item) => {
        const itemId = item.getId()
        return itemId ? !SINGLETON_TYPES.has(itemId) : true
      }),
    ])
