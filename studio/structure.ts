import type {StructureResolver} from 'sanity/structure'

const SINGLETON_TYPES = new Set(['siteContent', 'siteSettings', 'sitePage'])
const HIDDEN_FROM_DEFAULT_LIST = new Set([...SINGLETON_TYPES, 'pageSection'])

export const structure: StructureResolver = (S) =>
  S.list()
    .title('Content')
    .items([
      S.listItem()
        .id('site-page')
        .title('Site Page')
        .child(S.document().schemaType('sitePage').documentId('sitePage').title('Site Page')),
      S.documentTypeListItem('pageSection').title('Page Sections'),
      S.divider(),
      S.listItem()
        .id('site-content-legacy')
        .title('Site Content (Legacy)')
        .child(
          S.document()
            .schemaType('siteContent')
            .documentId('siteContent')
            .title('Site Content (Legacy)')
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
        return itemId ? !HIDDEN_FROM_DEFAULT_LIST.has(itemId) : true
      }),
    ])
