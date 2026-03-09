import {defineArrayMember, defineField, defineType} from 'sanity'
import {imageAltFields} from './imageFields'

const SITE_NAME_WARNING_MAX_LENGTH = 60
const SEO_DESCRIPTION_MIN_WARNING_LENGTH = 50
const SEO_DESCRIPTION_MAX_WARNING_LENGTH = 160
const OG_IMAGE_RECOMMENDED_WIDTH = 1200
const OG_IMAGE_RECOMMENDED_HEIGHT = 630
const OG_IMAGE_MIN_WIDTH = 600
const OG_IMAGE_MIN_HEIGHT = 315
const OG_IMAGE_RECOMMENDED_ASPECT_RATIO = OG_IMAGE_RECOMMENDED_WIDTH / OG_IMAGE_RECOMMENDED_HEIGHT
const OG_IMAGE_ASPECT_RATIO_TOLERANCE = 0.1

function getImageDimensionsFromAssetRef(
  value: unknown
): {width: number; height: number} | null {
  if (!value || typeof value !== 'object') {
    return null
  }

  const assetRef = (value as {asset?: {_ref?: unknown}}).asset?._ref
  if (typeof assetRef !== 'string') {
    return null
  }

  const dimensionMatch = assetRef.match(/-(\d+)x(\d+)-[a-z0-9]+$/i)
  if (!dimensionMatch) {
    return null
  }

  const width = Number.parseInt(dimensionMatch[1], 10)
  const height = Number.parseInt(dimensionMatch[2], 10)
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return null
  }

  return {width, height}
}

function validateOgImageDimensions(value: unknown): true | string {
  const dimensions = getImageDimensionsFromAssetRef(value)
  if (!dimensions) {
    return true
  }

  const {width, height} = dimensions
  const aspectRatio = width / height
  const minAspectRatio = OG_IMAGE_RECOMMENDED_ASPECT_RATIO - OG_IMAGE_ASPECT_RATIO_TOLERANCE
  const maxAspectRatio = OG_IMAGE_RECOMMENDED_ASPECT_RATIO + OG_IMAGE_ASPECT_RATIO_TOLERANCE
  const isBelowMinimum = width < OG_IMAGE_MIN_WIDTH || height < OG_IMAGE_MIN_HEIGHT
  const isBelowRecommended =
    width < OG_IMAGE_RECOMMENDED_WIDTH || height < OG_IMAGE_RECOMMENDED_HEIGHT
  const hasAspectRatioMismatch = aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio

  if (!isBelowMinimum && !isBelowRecommended && !hasAspectRatioMismatch) {
    return true
  }

  const recommendations: string[] = []

  if (isBelowMinimum) {
    recommendations.push(`at least ${OG_IMAGE_MIN_WIDTH}x${OG_IMAGE_MIN_HEIGHT}px`)
  }
  if (!isBelowMinimum && isBelowRecommended) {
    recommendations.push(`around ${OG_IMAGE_RECOMMENDED_WIDTH}x${OG_IMAGE_RECOMMENDED_HEIGHT}px`)
  }
  if (hasAspectRatioMismatch) {
    recommendations.push(
      `an aspect ratio near ${OG_IMAGE_RECOMMENDED_WIDTH}:${OG_IMAGE_RECOMMENDED_HEIGHT} (1.91:1)`
    )
  }

  return `OG previews work best with ${recommendations.join(
    ' and '
  )}. Current image is ${width}x${height}px.`
}

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

function validateContactFormAction(value: unknown): true | string {
  if (typeof value !== 'string' || value.trim() === '') {
    return true
  }

  const parsedUrl = parseAbsoluteUrl(value.trim())
  if (!parsedUrl) {
    return 'Enter a valid URL, for example https://formspree.io/f/your-form-id.'
  }

  if (parsedUrl.protocol === 'https:') {
    return true
  }

  const isLocalDevHttpUrl =
    parsedUrl.protocol === 'http:' &&
    (parsedUrl.hostname === 'localhost' || parsedUrl.hostname === '127.0.0.1')

  if (isLocalDevHttpUrl) {
    return true
  }

  return 'Use an https URL. For local development only, http://localhost or http://127.0.0.1 is allowed.'
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
      validation: (rule) => rule.custom(validateOgImageDimensions).warning(),
    }),
    defineField({
      name: 'social',
      title: 'Social',
      type: 'socialHandles',
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      description: 'Add section references and drag to set final page order.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'section'}],
        }),
      ],
      validation: (rule) => [rule.required().min(1), rule.unique()],
      options: {sortable: true},
    }),
    defineField({
      name: 'contact',
      title: 'Contact',
      type: 'object',
      fields: [
        defineField({
          name: 'bioText',
          title: 'Text',
          type: 'text',
          rows: 12,
        }),
        defineField({
          name: 'bioImage',
          title: 'Image',
          type: 'image',
          options: {hotspot: true},
          fields: imageAltFields(),
        }),
        defineField({
          name: 'formTitle',
          title: 'Form Title',
          type: 'string',
          initialValue: 'Request & Purchase',
        }),
        defineField({
          name: 'formAction',
          title: 'Form Action',
          type: 'url',
          validation: (rule) =>
            rule.required().error('Add a form endpoint URL.').custom(validateContactFormAction),
        }),
      ],
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
