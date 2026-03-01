import {createClient} from '@sanity/client'

const PROJECT_ID = 'wmjirbvx'
const DATASET = 'production'
const API_VERSION = '2026-02-28'

function hasFlag(flag) {
  return process.argv.includes(flag)
}

const shouldExecute = hasFlag('--execute')
const token = process.env.SANITY_API_TOKEN || process.env.SANITY_AUTH_TOKEN || ''

if (!token) {
  console.error('Missing SANITY_API_TOKEN (or SANITY_AUTH_TOKEN).')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token,
  useCdn: false,
})

function nonEmpty(value) {
  if (typeof value !== 'string') {
    return ''
  }
  return value.trim()
}

function toParagraphs(value) {
  const text = nonEmpty(value)
  if (!text) {
    return []
  }

  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function blockKey(sectionKey, label, index) {
  return `${sectionKey}-${label}-${index}`.replace(/[^a-zA-Z0-9_-]/g, '-')
}

function normalizeImage(image) {
  if (!image || typeof image !== 'object') {
    return null
  }

  const assetRef = image.asset?._ref
  if (typeof assetRef !== 'string' || !assetRef) {
    return null
  }

  const normalized = {
    _type: 'image',
    asset: {
      _type: 'reference',
      _ref: assetRef,
    },
  }

  if (image.crop && typeof image.crop === 'object') {
    normalized.crop = image.crop
  }
  if (image.hotspot && typeof image.hotspot === 'object') {
    normalized.hotspot = image.hotspot
  }
  if (typeof image.alt === 'string') {
    normalized.alt = image.alt
  }
  if (typeof image.caption === 'string') {
    normalized.caption = image.caption
  }

  return normalized
}

function createPortableTextNode(nodeKey, text, style = 'normal') {
  return {
    _type: 'block',
    _key: nodeKey,
    style,
    markDefs: [],
    children: [
      {
        _type: 'span',
        _key: `${nodeKey}-span-0`,
        text,
        marks: [],
      },
    ],
  }
}

function createPortableTextNodes(sectionKey, index, {heading = '', paragraphs = []}) {
  const normalizedHeading = nonEmpty(heading)
  const normalizedParagraphs = paragraphs
    .flatMap((value) => toParagraphs(value))
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  const body = []

  if (normalizedHeading) {
    body.push(createPortableTextNode(blockKey(sectionKey, 'text-heading-node', index), normalizedHeading, 'h3'))
  }

  normalizedParagraphs.forEach((paragraph, paragraphIndex) => {
    body.push(
      createPortableTextNode(
        blockKey(sectionKey, `text-node-${index}-${paragraphIndex}`, paragraphIndex),
        paragraph,
      ),
    )
  })

  return body
}

function createImageBlock(sectionKey, index, image, layout = 'full', align = 'left') {
  const normalizedImage = normalizeImage(image)
  if (!normalizedImage) {
    return null
  }

  return {
    _type: 'pageImageBlock',
    _key: blockKey(sectionKey, 'image', index),
    layout,
    align,
    image: normalizedImage,
  }
}

function createImagePairBlock(sectionKey, index, leftImage, rightImage, ratio = '50-50') {
  const normalizedLeftImage = normalizeImage(leftImage)
  const normalizedRightImage = normalizeImage(rightImage)
  if (!normalizedLeftImage || !normalizedRightImage) {
    return null
  }

  return {
    _type: 'pageImagePairBlock',
    _key: blockKey(sectionKey, 'pair', index),
    ratio,
    leftImage: normalizedLeftImage,
    rightImage: normalizedRightImage,
  }
}

function createContactFormBlock(sectionKey, index, heading, body, formAction) {
  const normalizedFormAction = nonEmpty(formAction)
  if (!normalizedFormAction) {
    return null
  }

  const block = {
    _type: 'contactFormBlock',
    _key: blockKey(sectionKey, 'contact-form', index),
    heading: nonEmpty(heading) || 'Request & Purchase',
    formAction: normalizedFormAction,
  }

  const portableBody = createPortableTextNodes(sectionKey, index, {paragraphs: [body]})
  block.body = portableBody

  return block
}

function compactBlocks(blocks) {
  const preparedBlocks = blocks
    .flatMap((block) => (Array.isArray(block) ? block : [block]))
    .filter(Boolean)
  if (preparedBlocks.length > 0) {
    return preparedBlocks
  }

  return [createPortableTextNode('fallback-text-node-0', ' ')]
}

function buildAboutContent(legacy) {
  return compactBlocks([
    createImageBlock('about', 0, legacy?.main_image, 'half', 'center'),
    createPortableTextNodes('about', 1, {paragraphs: [legacy?.text_1]}),
    createImageBlock('about', 2, legacy?.notation_image, 'full', 'left'),
    createPortableTextNodes('about', 3, {paragraphs: [legacy?.text_2]}),
  ])
}

function buildScentContent(legacy) {
  const comparisonImages = Array.isArray(legacy?.comparison_images)
    ? legacy.comparison_images
    : []

  return compactBlocks([
    createImageBlock('scent', 0, legacy?.main_image, 'full', 'left'),
    createPortableTextNodes('scent', 1, {
      heading: legacy?.title,
      paragraphs: [legacy?.description, legacy?.details],
    }),
    createImagePairBlock('scent', 2, comparisonImages[0], comparisonImages[1], '60-40'),
  ])
}

function buildProcessContent(legacy) {
  const galleryImages = Array.isArray(legacy?.gallery_images) ? legacy.gallery_images : []
  const galleryBlocks = galleryImages.map((image, index) =>
    createImageBlock('process', index + 1, image, 'full', 'left'),
  )

  return compactBlocks([
    createPortableTextNodes('process', 0, {
      paragraphs: [legacy?.text_1, legacy?.text_2, legacy?.text_3],
    }),
    ...galleryBlocks,
  ])
}

function buildStudioContent(legacy) {
  const blocks = []
  let index = 0

  const headerImages = Array.isArray(legacy?.header_images) ? legacy.header_images : []
  if (headerImages.length >= 2) {
    blocks.push(createImagePairBlock('studio', index++, headerImages[0], headerImages[1], '50-50'))
    for (let imageIndex = 2; imageIndex < headerImages.length; imageIndex += 1) {
      blocks.push(createImageBlock('studio', index++, headerImages[imageIndex], 'half', 'center'))
    }
  } else {
    for (const image of headerImages) {
      blocks.push(createImageBlock('studio', index++, image, 'half', 'center'))
    }
  }

  blocks.push(createPortableTextNodes('studio', index++, {paragraphs: [legacy?.intro_text]}))

  const projects = Array.isArray(legacy?.projects) ? legacy.projects : []
  for (const project of projects) {
    blocks.push(createImageBlock('studio', index++, project?.extra_image, 'full', 'left'))
    blocks.push(
      createPortableTextNodes('studio', index++, {
        heading: project?.title,
        paragraphs: [project?.materials, project?.location, project?.description],
      }),
    )
    blocks.push(createImageBlock('studio', index++, project?.main_image, 'full', 'left'))

    const galleryImages = Array.isArray(project?.gallery) ? project.gallery : []
    for (const galleryImage of galleryImages) {
      blocks.push(createImageBlock('studio', index++, galleryImage, 'half', 'center'))
    }

    blocks.push(createImageBlock('studio', index++, project?.secondary_image, 'full', 'left'))

    const verticalGalleryImages = Array.isArray(project?.gallery_vertical)
      ? project.gallery_vertical
      : []

    for (const verticalImage of verticalGalleryImages) {
      blocks.push(createImageBlock('studio', index++, verticalImage, 'full', 'left'))
    }
  }

  return compactBlocks(blocks)
}

function buildContactContent(legacy) {
  return compactBlocks([
    createPortableTextNodes('contact', 0, {paragraphs: [legacy?.bio_text]}),
    createImageBlock('contact', 1, legacy?.bio_image, 'half', 'right'),
    createContactFormBlock('contact', 2, 'Request & Purchase', '', legacy?.form_action),
  ])
}

function createSectionDocument(id, navLabel, title, content) {
  return {
    _id: id,
    _type: 'pageSection',
    navLabel,
    title,
    content,
  }
}

async function main() {
  const siteContent = await client.fetch(`*[_id == "siteContent"][0]{about, scent, process, studio, contact}`)

  if (!siteContent) {
    console.error('No siteContent singleton found. Nothing to migrate.')
    process.exit(1)
  }

  const sectionDocuments = [
    createSectionDocument('pageSection.about', 'ABOUT', 'About', buildAboutContent(siteContent.about)),
    createSectionDocument('pageSection.scent', 'SCENT', 'Scent', buildScentContent(siteContent.scent)),
    createSectionDocument('pageSection.process', 'PROCESS', 'Process', buildProcessContent(siteContent.process)),
    createSectionDocument('pageSection.studio', 'STUDIO', 'Studio', buildStudioContent(siteContent.studio)),
    createSectionDocument('pageSection.contact', 'CONTACT', 'Contact', buildContactContent(siteContent.contact)),
  ]

  const sitePageDocument = {
    _id: 'sitePage',
    _type: 'sitePage',
    sections: sectionDocuments.map((sectionDocument) => ({
      _type: 'reference',
      _ref: sectionDocument._id,
      _key: `section-${sectionDocument._id.replace('pageSection.', '')}`,
    })),
  }

  console.log('Prepared migration payload:')
  console.log(`- Sections: ${sectionDocuments.length}`)
  sectionDocuments.forEach((sectionDocument) => {
    console.log(`  - ${sectionDocument._id}: ${sectionDocument.content.length} blocks`)
  })

  if (!shouldExecute) {
    console.log('\nDry run complete. No writes performed.')
    console.log('Run with --execute to apply changes.')
    return
  }

  let transaction = client.transaction()
  for (const sectionDocument of sectionDocuments) {
    transaction = transaction.createOrReplace(sectionDocument)
  }
  transaction = transaction.createOrReplace(sitePageDocument)

  const result = await transaction.commit({visibility: 'sync'})
  console.log('\nMigration applied successfully.')
  console.log(`Transaction ID: ${result.transactionId}`)
}

main().catch((error) => {
  console.error('Migration failed.')
  console.error(error)
  process.exit(1)
})
