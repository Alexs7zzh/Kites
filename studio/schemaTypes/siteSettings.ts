import {defineField, defineType} from 'sanity'

export const socialHandlesType = defineType({
  name: 'socialHandles',
  title: 'Social Handles',
  type: 'object',
  fields: [
    defineField({
      name: 'xHandle',
      title: 'X (Twitter) Handle',
      type: 'string',
      description: 'Use only the handle, e.g. kitesstudio or @kitesstudio.',
    }),
    defineField({
      name: 'instagramHandle',
      title: 'Instagram Handle',
      type: 'string',
      description: 'Use only the handle, e.g. kitesstudio.',
    }),
  ],
})

export const siteSettingsType = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  fields: [
    defineField({
      name: 'siteName',
      title: 'Site Name',
      type: 'string',
    }),
    defineField({
      name: 'defaultDescription',
      title: 'Default Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160).warning('Consider staying under 160 characters.'),
    }),
    defineField({
      name: 'canonicalDomain',
      title: 'Canonical Domain',
      type: 'url',
      description: 'Production origin, e.g. https://example.com',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'defaultOgImage',
      title: 'Default Open Graph Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'social',
      title: 'Social',
      type: 'socialHandles',
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Site Settings',
        subtitle: 'Singleton',
      }
    },
  },
})

export const siteSettingsSchemaTypes = [socialHandlesType, siteSettingsType]
