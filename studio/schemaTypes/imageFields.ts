import {defineField} from 'sanity'

export function imageAltFields() {
  return [
    defineField({
      name: 'alt',
      title: 'Alt Text',
      type: 'string',
      description:
        'Meaningful description for screen readers. Leave empty when the image is decorative.',
    }),
  ]
}
