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

function imageFieldsWithCaption() {
  return [
    ...imageAltFields(),
    defineField({
      name: 'caption',
      title: 'Caption',
      type: 'string',
    }),
  ]
}

export const pagePortableTextBlockType = defineType({
  name: 'pagePortableTextBlock',
  title: 'Portable Text Block',
  type: 'object',
  fields: [
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading', value: 'h2'},
            {title: 'Subheading', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (rule) => rule.required(),
                  }),
                ],
              }),
            ],
          },
        }),
      ],
      validation: (rule) => rule.required().min(1),
    }),
  ],
  preview: {
    select: {
      body: 'body',
    },
    prepare({body}) {
      const firstBlock = Array.isArray(body) ? body.find((item) => item?._type === 'block') : null
      const text = Array.isArray(firstBlock?.children)
        ? firstBlock.children
            .map((child) => (typeof child?.text === 'string' ? child.text : ''))
            .join('')
            .trim()
        : ''
      return {
        title: text ? text.slice(0, 80) : 'Portable Text Block',
        subtitle: 'Portable Text Block',
      }
    },
  },
})

export const pageImageBlockType = defineType({
  name: 'pageImageBlock',
  title: 'Image Block',
  type: 'object',
  options: {
    modal: {
      type: 'dialog',
      width: 'auto',
    },
  },
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageFieldsWithCaption(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'layout',
      title: 'Layout',
      type: 'string',
      initialValue: 'full',
      options: {
        list: [
          {title: 'Full Width', value: 'full'},
          {title: 'Half Width', value: 'half'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'align',
      title: 'Alignment',
      type: 'string',
      initialValue: 'left',
      options: {
        list: [
          {title: 'Left', value: 'left'},
          {title: 'Center', value: 'center'},
          {title: 'Right', value: 'right'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      media: 'image',
      layout: 'layout',
      align: 'align',
    },
    prepare({layout, align, media}) {
      return {
        title: `Image (${layout ?? 'full'})`,
        subtitle: `Alignment: ${align ?? 'left'}`,
        media,
      }
    },
  },
})

export const pageImagePairBlockType = defineType({
  name: 'pageImagePairBlock',
  title: 'Image Pair Block',
  type: 'object',
  options: {
    modal: {
      type: 'dialog',
      width: 'auto',
    },
  },
  fields: [
    defineField({
      name: 'leftImage',
      title: 'Left Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageFieldsWithCaption(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'rightImage',
      title: 'Right Image',
      type: 'image',
      options: {hotspot: true},
      fields: imageFieldsWithCaption(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'ratio',
      title: 'Column Ratio',
      type: 'string',
      initialValue: '50-50',
      options: {
        list: [
          {title: '50 / 50', value: '50-50'},
          {title: '60 / 40', value: '60-40'},
          {title: '40 / 60', value: '40-60'},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: {
      media: 'leftImage',
      ratio: 'ratio',
    },
    prepare({ratio, media}) {
      return {
        title: `Image Pair (${ratio ?? '50-50'})`,
        subtitle: 'Image Pair Block',
        media,
      }
    },
  },
})

export const contactFormBlockType = defineType({
  name: 'contactFormBlock',
  title: 'Contact Form Block',
  type: 'object',
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      initialValue: 'Request & Purchase',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'Heading', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Emphasis', value: 'em'},
              {title: 'Code', value: 'code'},
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (rule) => rule.required(),
                  }),
                ],
              }),
            ],
          },
        }),
      ],
    }),
    defineField({
      name: 'formAction',
      title: 'Form Action',
      type: 'url',
      validation: (rule) =>
        rule.required().error('Add a form endpoint URL.').custom(validateContactFormAction),
    }),
  ],
  preview: {
    select: {
      heading: 'heading',
    },
    prepare({heading}) {
      return {
        title: heading || 'Contact Form',
        subtitle: 'Contact Form Block',
      }
    },
  },
})

export const pageSectionType = defineType({
  name: 'pageSection',
  title: 'Page Section',
  type: 'document',
  fields: [
    defineField({
      name: 'navLabel',
      title: 'Left Nav Label',
      description: 'Label shown in the left section menu.',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Section Title',
      type: 'string',
    }),
    defineField({
      name: 'content',
      title: 'Content Stream',
      description: 'Drag to reorder. Mix text and media blocks in any order.',
      type: 'array',
      of: [
        defineArrayMember({type: 'pagePortableTextBlock'}),
        defineArrayMember({type: 'pageImageBlock'}),
        defineArrayMember({type: 'pageImagePairBlock'}),
        defineArrayMember({type: 'contactFormBlock'}),
      ],
      validation: (rule) => rule.required().min(1),
      options: {
        sortable: true,
        modal: {
          type: 'dialog',
          width: 'auto',
        },
      },
    }),
  ],
  preview: {
    select: {
      navLabel: 'navLabel',
      contentCount: 'content.length',
    },
    prepare({navLabel, contentCount}) {
      return {
        title: navLabel,
        subtitle:
          typeof contentCount === 'number' ? `${contentCount} content items` : 'No content items',
      }
    },
  },
})

export const sitePageType = defineType({
  name: 'sitePage',
  title: 'Site Page',
  type: 'document',
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
      type: 'string',
      initialValue: 'Site Page',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'sections',
      title: 'Sections',
      description: 'Add section references and drag to set final page order.',
      type: 'array',
      of: [
        defineArrayMember({
          type: 'reference',
          to: [{type: 'pageSection'}],
        }),
      ],
      validation: (rule) => [rule.required().min(1), rule.unique()],
      options: {sortable: true},
    }),
  ],
  preview: {
    select: {
      title: 'title',
      sectionCount: 'sections.length',
    },
    prepare({title, sectionCount}) {
      return {
        title,
        subtitle:
          typeof sectionCount === 'number'
            ? `One page model • ${sectionCount} sections`
            : 'One page model',
      }
    },
  },
})

export const sitePageSchemaTypes = [
  pagePortableTextBlockType,
  pageImageBlockType,
  pageImagePairBlockType,
  contactFormBlockType,
  pageSectionType,
  sitePageType,
]
