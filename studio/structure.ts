import type {StructureResolver} from 'sanity/structure'

const SINGLETON_TYPES = new Set(['siteSettings'])
const HIDDEN_FROM_DEFAULT_LIST = new Set([...SINGLETON_TYPES, 'section'])

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .id('site-settings')
        .title('Site Settings')
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings')
        ),
      S.documentTypeListItem('section').title('Sections'),
      ...S.documentTypeListItems().filter((item) => {
        const itemId = item.getId()
        return itemId ? !HIDDEN_FROM_DEFAULT_LIST.has(itemId) : true
      }),
    ])
