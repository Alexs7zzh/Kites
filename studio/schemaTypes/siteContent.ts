import {defineArrayMember, defineField, defineType} from 'sanity'

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
      of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
      validation: (rule) => rule.required().min(2).max(2),
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
      of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
      validation: (rule) => rule.required().min(1),
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
    }),
    defineField({
      name: 'secondary_image',
      title: 'Secondary Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'extra_image',
      title: 'Extra Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'gallery',
      title: 'Gallery',
      type: 'array',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
    }),
    defineField({
      name: 'gallery_vertical',
      title: 'Gallery Vertical',
      type: 'array',
      of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
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
      of: [defineArrayMember({type: 'image', options: {hotspot: true}})],
      validation: (rule) => rule.required().min(1),
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
      validation: (rule) => rule.required().min(1),
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
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'form_action',
      title: 'Form Action',
      type: 'url',
      validation: (rule) => rule.required().uri({scheme: ['http', 'https']}),
    }),
  ],
})

export const seoType = defineType({
  name: 'seo',
  title: 'SEO',
  type: 'object',
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.max(70).warning('Consider staying under 70 characters.'),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(160).warning('Consider staying under 160 characters.'),
    }),
    defineField({
      name: 'noindex',
      title: 'Noindex',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'canonicalUrl',
      title: 'Canonical URL Override',
      type: 'url',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'ogImage',
      title: 'Open Graph Image Override',
      type: 'image',
      options: {hotspot: true},
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
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'seo',
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
  seoType,
  siteContentType,
]
