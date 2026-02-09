import {defineArrayMember, defineField, defineType} from 'sanity'
import {imageAltFields} from './imageFields'

function parseAbsoluteUrl(value: string): URL | null {
  try {
    return new URL(value)
  } catch {
    return null
  }
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

export const aboutSectionType = defineType({
  name: 'aboutSection',
  title: 'About Section',
  type: 'object',
  fields: [
    defineField({
      name: 'main_image',
      title: 'Main Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageAltFields(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text_1',
      title: 'Text 1',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'notation_image',
      title: 'Notation Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageAltFields(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text_2',
      title: 'Text 2',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
  ],
})

export const scentSectionType = defineType({
  name: 'scentSection',
  title: 'Scent Section',
  type: 'object',
  fields: [
    defineField({
      name: 'main_image',
      title: 'Main Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageAltFields(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'details',
      title: 'Details',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'comparison_images',
      title: 'Comparison Images',
      type: 'array',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: imageAltFields()})],
      validation: (rule) => [
        rule.required().error('Add exactly 2 comparison images.'),
        rule
          .custom((value) => {
            if (value === undefined) {
              return true
            }
            if (!Array.isArray(value) || value.length !== 2) {
              return 'Add exactly 2 comparison images.'
            }
            return true
          })
          .error('Add exactly 2 comparison images.'),
      ],
    }),
  ],
})

export const processSectionType = defineType({
  name: 'processSection',
  title: 'Process Section',
  type: 'object',
  fields: [
    defineField({
      name: 'text_1',
      title: 'Text 1',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text_2',
      title: 'Text 2',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'text_3',
      title: 'Text 3',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'gallery_images',
      title: 'Gallery Images',
      type: 'array',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: imageAltFields()})],
      validation: (rule) => [
        rule.required().error('Add at least 1 gallery image.'),
        rule.min(1).error('Add at least 1 gallery image.'),
      ],
    }),
  ],
})

export const studioProjectType = defineType({
  name: 'studioProject',
  title: 'Studio Project',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'materials',
      title: 'Materials',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
    }),
    defineField({
      name: 'main_image',
      title: 'Main Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageAltFields(),
    }),
    defineField({
      name: 'secondary_image',
      title: 'Secondary Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageAltFields(),
    }),
    defineField({
      name: 'extra_image',
      title: 'Extra Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageAltFields(),
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: imageAltFields()})],
    }),
    defineField({
      name: 'gallery_vertical',
      title: 'Gallery Vertical',
      type: 'array',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: imageAltFields()})],
    }),
  ],
})

export const studioSectionType = defineType({
  name: 'studioSection',
  title: 'Studio Section',
  type: 'object',
  fields: [
    defineField({
      name: 'header_images',
      title: 'Header Images',
      type: 'array',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}, fields: imageAltFields()})],
      validation: (rule) => [
        rule.required().error('Add at least 1 header image.'),
        rule.min(1).error('Add at least 1 header image.'),
      ],
    }),
    defineField({
      name: 'intro_text',
      title: 'Intro Text',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'projects',
      title: 'Projects',
      type: 'array',
      of: [defineArrayMember({type: 'studioProject'})],
      validation: (rule) => [
        rule.required().error('Add at least 1 project.'),
        rule.min(1).error('Add at least 1 project.'),
      ],
    }),
  ],
})

export const contactSectionType = defineType({
  name: 'contactSection',
  title: 'Contact Section',
  type: 'object',
  fields: [
    defineField({
      name: 'bio_text',
      title: 'Bio Text',
      type: 'text',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'bio_image',
      title: 'Bio Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageAltFields(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'form_action',
      title: 'Form Action',
      type: 'url',
      validation: (rule) =>
        rule.required().error('Add a form endpoint URL.').custom(validateContactFormAction),
    }),
  ],
})

export const siteContentType = defineType({
  name: 'siteContent',
  title: 'Site Content',
  type: 'document',
  fields: [
    defineField({
      name: 'about',
      title: 'About',
      type: 'aboutSection',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'scent',
      title: 'Scent',
      type: 'scentSection',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'process',
      title: 'Process',
      type: 'processSection',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'studio',
      title: 'Studio',
      type: 'studioSection',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'contact',
      title: 'Contact',
      type: 'contactSection',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare() {
      return {
        title: 'Site Content',
        subtitle: 'Singleton',
      }
    },
  },
})

export const siteContentSchemaTypes = [
  aboutSectionType,
  scentSectionType,
  processSectionType,
  studioProjectType,
  studioSectionType,
  contactSectionType,
  siteContentType,
]
