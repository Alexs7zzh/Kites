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

function imageGroupArrayField(title: string) {
  return defineField({
    name: 'images',
    title,
    description: 'Add up to 4 images.',
    type: 'array',
    of: [
      defineArrayMember({
        type: 'image',
        options: {hotspot: true},
        fields: imageAltFields(),
      }),
    ],
    validation: (rule) => rule.required().min(1).max(4),
    options: {
      sortable: true,
      layout: 'grid',
    },
  })
}

function portableTextMember() {
  return defineArrayMember({
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
  })
}

export const pagePortableTextBlockType = defineType({
  name: 'pagePortableTextBlock',
  title: 'Portable Text Block (Legacy)',
  type: 'object',
  fields: [
    defineField({
      name: 'body',
      title: 'Body',
      type: 'array',
      of: [portableTextMember()],
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
        subtitle: 'Legacy text block',
      }
    },
  },
})

export const pageSpacerBlockType = defineType({
  name: 'pageSpacerBlock',
  title: 'Spacer',
  type: 'object',
  fields: [
    defineField({
      name: 'level',
      title: 'Spacer Size',
      description: 'Choose a spacer height from 1 to 6.',
      type: 'number',
      initialValue: 1,
      options: {
        list: [
          {title: '1', value: 1},
          {title: '2', value: 2},
          {title: '3', value: 3},
          {title: '4', value: 4},
          {title: '5', value: 5},
          {title: '6', value: 6},
        ],
        layout: 'radio',
      },
      validation: (rule) => rule.required().integer().min(1).max(6),
    }),
  ],
  preview: {
    select: {
      level: 'level',
    },
    prepare({level}) {
      const safeLevel = Number.isInteger(level) && level >= 1 && level <= 6 ? level : 1
      return {
        title: `Spacer (${safeLevel})`,
        subtitle: `Spacer level ${safeLevel}`,
      }
    },
  },
})

export const pageFullImageGroupBlockType = defineType({
  name: 'pageFullImageGroupBlock',
  title: 'Full Width Image Group',
  type: 'object',
  options: {
    modal: {
      type: 'dialog',
      width: 'auto',
    },
  },
  fields: [imageGroupArrayField('Images')],
  preview: {
    select: {
      image0: 'images.0',
      image1: 'images.1',
      image2: 'images.2',
      image3: 'images.3',
    },
    prepare({image0, image1, image2, image3}) {
      const imageCount = [image0, image1, image2, image3].filter(Boolean).length
      return {
        title: 'Full Width Image Group',
        subtitle: `${imageCount ?? 0} image${imageCount === 1 ? '' : 's'}`,
        media: image0,
      }
    },
  },
})

export const pageHalfImageGroupBlockType = defineType({
  name: 'pageHalfImageGroupBlock',
  title: 'Half Width Image Group',
  type: 'object',
  options: {
    modal: {
      type: 'dialog',
      width: 'auto',
    },
  },
  fields: [
    imageGroupArrayField('Images'),
    defineField({
      name: 'captionTitle',
      title: 'Caption Title',
      type: 'string',
    }),
    defineField({
      name: 'captionDescription',
      title: 'Caption Description',
      type: 'text',
      rows: 5,
    }),
  ],
  preview: {
    select: {
      image0: 'images.0',
      image1: 'images.1',
      image2: 'images.2',
      image3: 'images.3',
      captionTitle: 'captionTitle',
    },
    prepare({image0, image1, image2, image3, captionTitle}) {
      const imageCount = [image0, image1, image2, image3].filter(Boolean).length
      return {
        title: captionTitle || 'Half Width Image Group',
        subtitle: `${imageCount ?? 0} image${imageCount === 1 ? '' : 's'}`,
        media: image0,
      }
    },
  },
})

export const sectionType = defineType({
  name: 'section',
  title: 'Section',
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
      title: 'Content',
      description: 'Add text, spacer, and image blocks, then drag to set the order.',
      type: 'array',
      of: [
        portableTextMember(),
        defineArrayMember({type: 'pageSpacerBlock'}),
        defineArrayMember({type: 'pagePortableTextBlock'}),
        defineArrayMember({type: 'pageFullImageGroupBlock'}),
        defineArrayMember({type: 'pageHalfImageGroupBlock'}),
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

export const sectionSchemaTypes = [
  pagePortableTextBlockType,
  pageSpacerBlockType,
  pageFullImageGroupBlockType,
  pageHalfImageGroupBlockType,
  sectionType,
]
