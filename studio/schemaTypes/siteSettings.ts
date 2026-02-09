import {defineField, defineType} from 'sanity'
import {imageAltFields} from './imageFields'

const SITE_NAME_WARNING_MAX_LENGTH = 60
const SEO_DESCRIPTION_MIN_WARNING_LENGTH = 50
const SEO_DESCRIPTION_MAX_WARNING_LENGTH = 160

function parseAbsoluteUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
}

function hasOnlyOrigin(url: URL): boolean {
  const hasRootPath = url.pathname === '/' || url.pathname === ''
  return hasRootPath && url.search === '' && url.hash === ''
}

function validateCanonicalDomain(value: unknown): true | string {
  if (typeof value !== 'string' || value.trim() === '') {
    return true
  }

  const parsedUrl = parseAbsoluteUrl(value.trim())
  if (!parsedUrl) {
    return 'Enter a valid absolute URL, for example https://example.com.'
  }
  if (parsedUrl.protocol !== 'https:') {
    return 'Use an https URL for Canonical Domain, for example https://example.com.'
  }
  if (!hasOnlyOrigin(parsedUrl)) {
    return 'Use only the site origin with no path, query, or hash, for example https://example.com.'
  }

  return true
}

export const socialHandlesType = defineType({
  name: 'socialHandles',
  title: 'Social Handles',
  type: 'object',
  fields: [
    defineField({
      name: 'xHandle',
      title: 'X (Twitter) Handle',
      type: 'string',
      description: 'Use only the handle, e.g. kitesstudio (no @).',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) {
            return true
          }
          return value.includes('@')
            ? 'Do not include "@". Use only the handle, e.g. kitesstudio.'
            : true
        }),
    }),
    defineField({
      name: 'instagramHandle',
      title: 'Instagram Handle',
      type: 'string',
      description: 'Use only the handle, e.g. kitesstudio (no @).',
      validation: (rule) =>
        rule.custom((value) => {
          if (!value) {
            return true
          }
          return value.includes('@')
            ? 'Do not include "@". Use only the handle, e.g. kitesstudio.'
            : true
        }),
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
      validation: (rule) => [
        rule
          .max(SITE_NAME_WARNING_MAX_LENGTH)
          .warning(
            `Consider staying under ${SITE_NAME_WARNING_MAX_LENGTH} characters for SEO titles.`
          ),
      ],
    }),
    defineField({
      name: 'defaultDescription',
      title: 'Default Description',
      type: 'text',
      rows: 3,
      validation: (rule) => [
        rule
          .custom((value) => {
            if (typeof value !== 'string' || value.trim() === '') {
              return 'Add a default description to improve search snippets.'
            }
            return true
          })
          .warning(),
        rule
          .custom((value) => {
            if (typeof value !== 'string') {
              return true
            }
            const description = value.trim()
            if (description === '') {
              return true
            }

            return description.length < SEO_DESCRIPTION_MIN_WARNING_LENGTH
              ? `Consider using at least ${SEO_DESCRIPTION_MIN_WARNING_LENGTH} characters for better snippet context.`
              : true
          })
          .warning(),
        rule
          .max(SEO_DESCRIPTION_MAX_WARNING_LENGTH)
          .warning(
            `Consider staying under ${SEO_DESCRIPTION_MAX_WARNING_LENGTH} characters for search snippets.`
          ),
      ],
    }),
    defineField({
      name: 'canonicalDomain',
      title: 'Canonical Domain',
      type: 'url',
      description: 'Production origin, e.g. https://example.com',
      validation: (rule) => rule.custom(validateCanonicalDomain),
    }),
    defineField({
      name: 'defaultOgImage',
      title: 'Link Preview Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageAltFields(),
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
