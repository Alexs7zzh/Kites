import type {getImage as astroGetImage} from 'astro:assets'
import {
  createImagePayload,
  prepareSiteContent,
  type PreparedImage,
} from './siteContentImagePreparation'

type GetImageFn = typeof astroGetImage

type SlotConfig = Parameters<typeof createImagePayload>[1]

export type PortableTextStyle = 'normal' | 'h2' | 'h3' | 'blockquote'

export type PreparedPortableTextMarkDef = {
  _key: string
  _type: 'link'
  href: string
}

export type PreparedPortableTextSpan = {
  _type: 'span'
  _key: string
  text: string
  marks: string[]
}

export type PreparedPortableTextNode = {
  _type: 'block'
  _key: string
  style: PortableTextStyle
  children: PreparedPortableTextSpan[]
  markDefs: PreparedPortableTextMarkDef[]
}

type PreparedPortableTextBlock = {
  _key: string
  _type: 'portableTextBlock'
  body: PreparedPortableTextNode[]
}

type PreparedImageBlock = {
  _key: string
  _type: 'pageImageBlock'
  layout: 'full' | 'half'
  align: 'left' | 'center' | 'right'
  image: PreparedImage
}

type PreparedImagePairBlock = {
  _key: string
  _type: 'pageImagePairBlock'
  ratio: '50-50' | '60-40' | '40-60'
  leftImage: PreparedImage
  rightImage: PreparedImage
}

type PreparedContactFormBlock = {
  _key: string
  _type: 'contactFormBlock'
  heading: string
  body: PreparedPortableTextNode[]
  formAction: string
}

export type PreparedPageContentBlock =
  | PreparedPortableTextBlock
  | PreparedImageBlock
  | PreparedImagePairBlock
  | PreparedContactFormBlock

export type PreparedPageSection = {
  _id: string
  _key: string
  sectionId: string
  navLabel: string
  title: string | null
  content: PreparedPageContentBlock[]
}

export type PreparedPageContent = {
  sections: PreparedPageSection[]
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue === '' ? null : trimmedValue
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function normalizeBlockKey(value: unknown, fallback: string): string {
  return nonEmpty(value) ?? fallback
}

const PORTABLE_TEXT_STYLES = new Set<PortableTextStyle>(['normal', 'h2', 'h3', 'blockquote'])

function normalizePortableTextStyle(value: unknown): PortableTextStyle {
  if (typeof value === 'string' && PORTABLE_TEXT_STYLES.has(value as PortableTextStyle)) {
    return value as PortableTextStyle
  }
  return 'normal'
}

function normalizePortableTextMarks(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const marks = value
    .filter((mark): mark is string => typeof mark === 'string' && mark.trim() !== '')
    .map((mark) => mark.trim())

  return [...new Set(marks)]
}

function normalizePortableTextMarkDefs(
  value: unknown,
  keyPrefix: string,
): PreparedPortableTextMarkDef[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((rawMarkDef, index) => {
      const markDef = asRecord(rawMarkDef)
      const markDefType = nonEmpty(markDef._type)
      if (markDefType !== 'link') {
        return null
      }

      const href = nonEmpty(markDef.href)
      if (!href) {
        return null
      }

      return {
        _key: normalizeBlockKey(markDef._key, `${keyPrefix}-mark-${index}`),
        _type: 'link' as const,
        href,
      }
    })
    .filter((markDef): markDef is PreparedPortableTextMarkDef => markDef !== null)
}

function normalizePortableTextNodes(value: unknown, keyPrefix: string): PreparedPortableTextNode[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((rawNode, nodeIndex) => normalizePortableTextNode(rawNode, `${keyPrefix}-node-${nodeIndex}`))
    .filter((node): node is PreparedPortableTextNode => node !== null)
}

function normalizePortableTextNode(rawNode: unknown, keyPrefix: string): PreparedPortableTextNode | null {
  const node = asRecord(rawNode)
  if (nonEmpty(node._type) !== 'block') {
    return null
  }

  const childrenValue = Array.isArray(node.children) ? node.children : []
  const children = childrenValue
    .map((rawChild, childIndex) => {
      const child = asRecord(rawChild)
      if (nonEmpty(child._type) !== 'span') {
        return null
      }

      const text = typeof child.text === 'string' ? child.text : ''
      return {
        _type: 'span' as const,
        _key: normalizeBlockKey(child._key, `${keyPrefix}-span-${childIndex}`),
        text,
        marks: normalizePortableTextMarks(child.marks),
      }
    })
    .filter((child): child is PreparedPortableTextSpan => child !== null)

  if (children.length === 0) {
    return null
  }

  return {
    _type: 'block' as const,
    _key: normalizeBlockKey(node._key, keyPrefix),
    style: normalizePortableTextStyle(node.style),
    children,
    markDefs: normalizePortableTextMarkDefs(node.markDefs, keyPrefix),
  }
}

function plainTextToPortableTextNodes(value: string, keyPrefix: string): PreparedPortableTextNode[] {
  const normalizedText = value.replace(/\r\n/g, '\n').trim()
  if (!normalizedText) {
    return []
  }

  const paragraphs = normalizedText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return paragraphs.map((paragraph, paragraphIndex) => ({
    _type: 'block',
    _key: `${keyPrefix}-node-${paragraphIndex}`,
    style: 'normal',
    children: [
      {
        _type: 'span',
        _key: `${keyPrefix}-span-${paragraphIndex}-0`,
        text: paragraph,
        marks: [],
      },
    ],
    markDefs: [],
  }))
}

function portableTextBlockFromBody(
  body: PreparedPortableTextNode[],
  blockKey: string,
): PreparedPortableTextBlock | null {
  if (body.length === 0) {
    return null
  }

  return {
    _key: blockKey,
    _type: 'portableTextBlock',
    body,
  }
}

function portableTextBlockFromPlainText(value: unknown, blockKey: string): PreparedPortableTextBlock | null {
  const text = nonEmpty(value)
  if (!text) {
    return null
  }

  return portableTextBlockFromBody(plainTextToPortableTextNodes(text, blockKey), blockKey)
}

function buildPortableTextBlock(
  options: {
    heading?: string | null
    paragraphs?: Array<string | null>
  },
  blockKey: string,
): PreparedPortableTextBlock | null {
  const body: PreparedPortableTextNode[] = []

  const heading = nonEmpty(options.heading)
  if (heading) {
    body.push({
      _type: 'block',
      _key: `${blockKey}-node-heading`,
      style: 'h3',
      children: [
        {
          _type: 'span',
          _key: `${blockKey}-span-heading-0`,
          text: heading,
          marks: [],
        },
      ],
      markDefs: [],
    })
  }

  for (const [index, paragraph] of (options.paragraphs ?? []).entries()) {
    const text = nonEmpty(paragraph)
    if (!text) {
      continue
    }

    const paragraphNodes = plainTextToPortableTextNodes(text, `${blockKey}-paragraph-${index}`)
    body.push(...paragraphNodes)
  }

  return portableTextBlockFromBody(body, blockKey)
}

const MOBILE_CONTENT_WIDTH = 'calc(65vw - 40px)'
const DESKTOP_CONTENT_WIDTH_PRE_GUTTER = 'calc(55vw - 160px)'
const DESKTOP_CONTENT_WIDTH_POST_GUTTER = 'calc((55vw + 236px) - (80px + (80px + 236px)))'

function scaleSize(baseSize: string, factor: number): string {
  return `calc(${baseSize} * ${factor})`
}

const FULL_WIDTH_SIZES =
  `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
  `(max-width: 999px) ${DESKTOP_CONTENT_WIDTH_PRE_GUTTER}, ` +
  `${DESKTOP_CONTENT_WIDTH_POST_GUTTER}`

const HALF_WIDTH_SIZES =
  `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
  `(max-width: 999px) ${scaleSize(DESKTOP_CONTENT_WIDTH_PRE_GUTTER, 0.5)}, ` +
  `${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.5)}`

function createSlotConfig(
  sizes: string,
  widths: number[],
  loading: 'lazy' | 'eager' = 'lazy',
  decoding: 'async' | 'sync' = 'async',
  fetchPriority: 'auto' | 'high' = 'auto',
): SlotConfig {
  return {
    sizes,
    widths,
    loading,
    decoding,
    fetchPriority,
  }
}

const SLOT_CONFIGS = {
  full: createSlotConfig(FULL_WIDTH_SIZES, [480, 768, 1024]),
  half: createSlotConfig(HALF_WIDTH_SIZES, [320, 640, 768]),
  pair50: createSlotConfig(
    `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
      `(max-width: 999px) ${scaleSize(DESKTOP_CONTENT_WIDTH_PRE_GUTTER, 0.5)}, ` +
      `${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.5)}`,
    [320, 480, 640],
  ),
  pair60: createSlotConfig(
    `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
      `(max-width: 999px) ${scaleSize(DESKTOP_CONTENT_WIDTH_PRE_GUTTER, 0.6)}, ` +
      `${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.6)}`,
    [360, 560, 720],
  ),
  pair40: createSlotConfig(
    `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
      `(max-width: 999px) ${scaleSize(DESKTOP_CONTENT_WIDTH_PRE_GUTTER, 0.4)}, ` +
      `${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.4)}`,
    [280, 440, 600],
  ),
}

function resolvePairSlots(ratio: '50-50' | '60-40' | '40-60') {
  if (ratio === '60-40') {
    return {
      left: SLOT_CONFIGS.pair60,
      right: SLOT_CONFIGS.pair40,
    }
  }

  if (ratio === '40-60') {
    return {
      left: SLOT_CONFIGS.pair40,
      right: SLOT_CONFIGS.pair60,
    }
  }

  return {
    left: SLOT_CONFIGS.pair50,
    right: SLOT_CONFIGS.pair50,
  }
}

async function prepareNonTextBlock(
  rawBlock: unknown,
  blockIndex: number,
  getImage: GetImageFn,
): Promise<Exclude<PreparedPageContentBlock, PreparedPortableTextBlock> | null> {
  const blockRecord = asRecord(rawBlock)
  const blockType = nonEmpty(blockRecord._type)
  const blockKey = normalizeBlockKey(blockRecord._key, `block-${blockIndex}`)

  if (blockType === 'pageImageBlock') {
    const layout = blockRecord.layout === 'half' ? 'half' : 'full'
    const align =
      blockRecord.align === 'center' || blockRecord.align === 'right' ? blockRecord.align : 'left'

    const image = await createImagePayload(
      blockRecord.image,
      layout === 'half' ? SLOT_CONFIGS.half : SLOT_CONFIGS.full,
      getImage,
    )

    if (!image) {
      return null
    }

    return {
      _key: blockKey,
      _type: 'pageImageBlock',
      layout,
      align,
      image,
    }
  }

  if (blockType === 'pageImagePairBlock') {
    const ratio =
      blockRecord.ratio === '60-40' || blockRecord.ratio === '40-60'
        ? blockRecord.ratio
        : '50-50'
    const pairSlots = resolvePairSlots(ratio)

    const [leftImage, rightImage] = await Promise.all([
      createImagePayload(blockRecord.leftImage, pairSlots.left, getImage),
      createImagePayload(blockRecord.rightImage, pairSlots.right, getImage),
    ])

    if (!leftImage || !rightImage) {
      return null
    }

    return {
      _key: blockKey,
      _type: 'pageImagePairBlock',
      ratio,
      leftImage,
      rightImage,
    }
  }

  if (blockType === 'contactFormBlock') {
    const formAction = nonEmpty(blockRecord.formAction)
    if (!formAction) {
      return null
    }

    const body = normalizePortableTextNodes(blockRecord.body, `${blockKey}-body`)

    return {
      _key: blockKey,
      _type: 'contactFormBlock',
      heading: nonEmpty(blockRecord.heading) ?? 'Request & Purchase',
      body,
      formAction,
    }
  }

  return null
}

function mergePortableTextNodesIntoContent(
  content: PreparedPageContentBlock[],
  pendingNodes: PreparedPortableTextNode[],
  keyPrefix: string,
) {
  if (pendingNodes.length === 0) {
    return
  }

  const firstNodeKey = pendingNodes[0]?._key ?? keyPrefix
  content.push({
    _key: normalizeBlockKey(firstNodeKey, keyPrefix),
    _type: 'portableTextBlock',
    body: pendingNodes.splice(0),
  })
}

export async function preparePageContent(
  rawSitePage: unknown,
  getImage: GetImageFn,
): Promise<PreparedPageContent | null> {
  if (!rawSitePage || typeof rawSitePage !== 'object') {
    return null
  }

  const sitePageRecord = asRecord(rawSitePage)
  const sectionRefs = Array.isArray(sitePageRecord.sections) ? sitePageRecord.sections : []

  const sections = await Promise.all(
    sectionRefs.map(async (rawSectionRef, sectionIndex) => {
      const sectionRefRecord = asRecord(rawSectionRef)
      const sectionRecord = asRecord(sectionRefRecord.section)
      const sectionId = nonEmpty(sectionRecord._id) ?? `section-${sectionIndex + 1}`
      const sectionKey = normalizeBlockKey(sectionRefRecord._key, `section-${sectionIndex + 1}`)
      const navLabel = nonEmpty(sectionRecord.navLabel) ?? `SECTION ${sectionIndex + 1}`
      const rawBlocks = Array.isArray(sectionRecord.content) ? sectionRecord.content : []
      const content: PreparedPageContentBlock[] = []
      const pendingPortableTextNodes: PreparedPortableTextNode[] = []

      for (const [blockIndex, rawBlock] of rawBlocks.entries()) {
        const blockRecord = asRecord(rawBlock)
        const blockType = nonEmpty(blockRecord._type)
        const blockKey = normalizeBlockKey(blockRecord._key, `block-${blockIndex}`)

        if (blockType === 'block') {
          const portableNode = normalizePortableTextNode(rawBlock, blockKey)
          if (portableNode) {
            pendingPortableTextNodes.push(portableNode)
          }
          continue
        }

        if (blockType === 'pagePortableTextBlock') {
          const portableNodes = normalizePortableTextNodes(blockRecord.body, blockKey)
          if (portableNodes.length > 0) {
            pendingPortableTextNodes.push(...portableNodes)
          }
          continue
        }

        mergePortableTextNodesIntoContent(
          content,
          pendingPortableTextNodes,
          `portable-${sectionKey}-${blockIndex}`,
        )

        const preparedNonTextBlock = await prepareNonTextBlock(rawBlock, blockIndex, getImage)
        if (preparedNonTextBlock) {
          content.push(preparedNonTextBlock)
        }
      }

      mergePortableTextNodesIntoContent(
        content,
        pendingPortableTextNodes,
        `portable-${sectionKey}-tail`,
      )

      return {
        _id: sectionId,
        _key: sectionKey,
        sectionId: `section-${slugify(navLabel) || 'section'}-${sectionKey}`,
        navLabel,
        title: nonEmpty(sectionRecord.title),
        content,
      }
    }),
  )

  return {
    sections,
  }
}

function createPreparedSection(
  navLabel: string,
  title: string,
  content: PreparedPageContentBlock[],
  sectionIndex: number,
): PreparedPageSection {
  const normalizedLabel = nonEmpty(navLabel) ?? `SECTION ${sectionIndex + 1}`
  const sectionKey = `legacy-${slugify(normalizedLabel) || sectionIndex}`
  return {
    _id: sectionKey,
    _key: sectionKey,
    sectionId: `section-${slugify(normalizedLabel) || 'section'}-${sectionKey}`,
    navLabel: normalizedLabel,
    title,
    content,
  }
}

function toPortableTextBlock(value: unknown, key: string): PreparedPortableTextBlock | null {
  return portableTextBlockFromPlainText(value, key)
}

function toImageBlock(
  image: unknown,
  key: string,
  layout: 'full' | 'half',
  align: 'left' | 'center' | 'right',
): PreparedImageBlock | null {
  if (!image || typeof image !== 'object') {
    return null
  }

  return {
    _key: key,
    _type: 'pageImageBlock',
    layout,
    align,
    image: image as PreparedImage,
  }
}

function toImagePairBlock(
  leftImage: unknown,
  rightImage: unknown,
  key: string,
  ratio: '50-50' | '60-40' | '40-60',
): PreparedImagePairBlock | null {
  if (!leftImage || typeof leftImage !== 'object' || !rightImage || typeof rightImage !== 'object') {
    return null
  }

  return {
    _key: key,
    _type: 'pageImagePairBlock',
    ratio,
    leftImage: leftImage as PreparedImage,
    rightImage: rightImage as PreparedImage,
  }
}

function compactContent(content: Array<PreparedPageContentBlock | null>): PreparedPageContentBlock[] {
  return content.filter((block): block is PreparedPageContentBlock => block !== null)
}

export async function prepareLegacySiteContentPage(
  rawLegacySiteContent: unknown,
  getImage: GetImageFn,
): Promise<PreparedPageContent | null> {
  const preparedLegacy = await prepareSiteContent(rawLegacySiteContent, getImage)
  if (!preparedLegacy) {
    return null
  }

  const preparedLegacyRecord = asRecord(preparedLegacy)
  const aboutRecord = asRecord(preparedLegacyRecord.about)
  const scentRecord = asRecord(preparedLegacyRecord.scent)
  const processRecord = asRecord(preparedLegacyRecord.process)
  const studioRecord = asRecord(preparedLegacyRecord.studio)
  const contactRecord = asRecord(preparedLegacyRecord.contact)

  const aboutContent = compactContent([
    toImageBlock(aboutRecord.main_image, 'legacy-about-image-0', 'half', 'center'),
    toPortableTextBlock(aboutRecord.text_1, 'legacy-about-text-1'),
    toImageBlock(aboutRecord.notation_image, 'legacy-about-image-2', 'full', 'left'),
    toPortableTextBlock(aboutRecord.text_2, 'legacy-about-text-3'),
  ])

  const scentComparisonImages = Array.isArray(scentRecord.comparison_images)
    ? scentRecord.comparison_images
    : []

  const scentContent = compactContent([
    toImageBlock(scentRecord.main_image, 'legacy-scent-image-0', 'full', 'left'),
    buildPortableTextBlock(
      {
        heading: nonEmpty(scentRecord.title),
        paragraphs: [nonEmpty(scentRecord.description), nonEmpty(scentRecord.details)],
      },
      'legacy-scent-text-1',
    ),
    toImagePairBlock(
      scentComparisonImages[0],
      scentComparisonImages[1],
      'legacy-scent-pair-2',
      '60-40',
    ),
  ])

  const processGalleryImages = Array.isArray(processRecord.gallery_images) ? processRecord.gallery_images : []
  const processContent: Array<PreparedPageContentBlock | null> = [
    buildPortableTextBlock(
      {
        paragraphs: [
          nonEmpty(processRecord.text_1),
          nonEmpty(processRecord.text_2),
          nonEmpty(processRecord.text_3),
        ],
      },
      'legacy-process-text-0',
    ),
  ]
  processGalleryImages.forEach((image, index) => {
    processContent.push(toImageBlock(image, `legacy-process-image-${index + 1}`, 'full', 'left'))
  })

  const studioHeaderImages = Array.isArray(studioRecord.header_images) ? studioRecord.header_images : []
  const studioProjects = Array.isArray(studioRecord.projects) ? studioRecord.projects : []
  const studioContent: Array<PreparedPageContentBlock | null> = []
  if (studioHeaderImages.length >= 2) {
    studioContent.push(
      toImagePairBlock(studioHeaderImages[0], studioHeaderImages[1], 'legacy-studio-pair-0', '50-50'),
    )
    for (let index = 2; index < studioHeaderImages.length; index += 1) {
      studioContent.push(
        toImageBlock(studioHeaderImages[index], `legacy-studio-image-header-${index}`, 'half', 'center'),
      )
    }
  } else {
    studioHeaderImages.forEach((image, index) => {
      studioContent.push(toImageBlock(image, `legacy-studio-image-header-${index}`, 'half', 'center'))
    })
  }
  studioContent.push(toPortableTextBlock(studioRecord.intro_text, 'legacy-studio-text-intro'))
  studioProjects.forEach((project, projectIndex) => {
    const projectRecord = asRecord(project)
    studioContent.push(
      toImageBlock(projectRecord.extra_image, `legacy-studio-project-extra-${projectIndex}`, 'full', 'left'),
    )
    studioContent.push(
      buildPortableTextBlock(
        {
          heading: nonEmpty(projectRecord.title),
          paragraphs: [
            nonEmpty(projectRecord.materials),
            nonEmpty(projectRecord.location),
            nonEmpty(projectRecord.description),
          ],
        },
        `legacy-studio-project-text-${projectIndex}`,
      ),
    )
    studioContent.push(
      toImageBlock(projectRecord.main_image, `legacy-studio-project-main-${projectIndex}`, 'full', 'left'),
    )
    const galleryImages = Array.isArray(projectRecord.gallery) ? projectRecord.gallery : []
    galleryImages.forEach((image, galleryIndex) => {
      studioContent.push(
        toImageBlock(
          image,
          `legacy-studio-project-gallery-${projectIndex}-${galleryIndex}`,
          'half',
          'center',
        ),
      )
    })
    studioContent.push(
      toImageBlock(
        projectRecord.secondary_image,
        `legacy-studio-project-secondary-${projectIndex}`,
        'full',
        'left',
      ),
    )
    const verticalGallery = Array.isArray(projectRecord.gallery_vertical)
      ? projectRecord.gallery_vertical
      : []
    verticalGallery.forEach((image, galleryIndex) => {
      studioContent.push(
        toImageBlock(
          image,
          `legacy-studio-project-vertical-${projectIndex}-${galleryIndex}`,
          'full',
          'left',
        ),
      )
    })
  })

  const contactContent = compactContent([
    toPortableTextBlock(contactRecord.bio_text, 'legacy-contact-text-0'),
    toImageBlock(contactRecord.bio_image, 'legacy-contact-image-1', 'half', 'right'),
    nonEmpty(contactRecord.form_action)
      ? {
          _key: 'legacy-contact-form-2',
          _type: 'contactFormBlock',
          heading: 'Request & Purchase',
          body: [],
          formAction: nonEmpty(contactRecord.form_action) as string,
        }
      : null,
  ])

  const sections: PreparedPageSection[] = [
    createPreparedSection('ABOUT', 'About', aboutContent, 0),
    createPreparedSection('SCENT', 'Scent', scentContent, 1),
    createPreparedSection('PROCESS', 'Process', compactContent(processContent), 2),
    createPreparedSection('STUDIO', 'Studio', compactContent(studioContent), 3),
    createPreparedSection('CONTACT', 'Contact', contactContent, 4),
  ]

  return {
    sections,
  }
}
