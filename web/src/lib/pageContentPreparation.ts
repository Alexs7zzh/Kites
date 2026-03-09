import type {getImage as astroGetImage} from 'astro:assets'
import {
  createImagePayload,
  type PreparedImage,
} from './imagePreparation'

type GetImageFn = typeof astroGetImage

type SlotConfig = Parameters<typeof createImagePayload>[1]

type PortableTextStyle = 'normal' | 'h2' | 'h3' | 'blockquote'

type PreparedPortableTextMarkDef = {
  _key: string
  _type: 'link'
  href: string
}

type PreparedPortableTextSpan = {
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

type PreparedImageGroupCaption = {
  title: string | null
  description: string | null
}

type PreparedImageGroupBlock = {
  _key: string
  _type: 'pageImageGroupBlock'
  layout: 'full' | 'half'
  images: PreparedImage[]
  caption: PreparedImageGroupCaption | null
}

type PreparedSpacerBlock = {
  _key: string
  _type: 'pageSpacerBlock'
  level: 1 | 2 | 3 | 4 | 5 | 6
}

type PreparedContactForm = {
  heading: string
  formAction: string
}

export type PreparedPageContentBlock =
  | PreparedPortableTextBlock
  | PreparedImageGroupBlock
  | PreparedSpacerBlock

export type PreparedPageSection = {
  _id: string
  _key: string
  sectionId: string
  navLabel: string
  title: string | null
  content: PreparedPageContentBlock[]
}

export type PreparedContactSection = {
  sectionId: string
  navLabel: string
  title: string | null
  bioText: PreparedPortableTextBlock | null
  bioImage: PreparedImage | null
  form: PreparedContactForm | null
}

export type PreparedNavItem = {
  sectionId: string
  navLabel: string
}

export type PreparedPageContent = {
  sections: PreparedPageSection[]
  contact: PreparedContactSection | null
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
}

function createFractionalSlotConfig(factor: number): SlotConfig {
  return createSlotConfig(
    `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
      `(max-width: 999px) ${scaleSize(DESKTOP_CONTENT_WIDTH_PRE_GUTTER, factor)}, ` +
      `${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, factor)}`,
    factor >= 0.5 ? [320, 480, 640] : factor >= 0.33 ? [240, 360, 480] : [180, 280, 360],
  )
}

function resolveImageGroupSlot(layout: 'full' | 'half', imageCount: number): SlotConfig {
  if (layout === 'full') {
    if (imageCount <= 1) {
      return SLOT_CONFIGS.full
    }
    if (imageCount === 2) {
      return createFractionalSlotConfig(0.5)
    }
    if (imageCount === 3) {
      return createFractionalSlotConfig(1 / 3)
    }
    return createFractionalSlotConfig(0.25)
  }

  if (imageCount <= 1) {
    return SLOT_CONFIGS.half
  }
  if (imageCount === 2) {
    return createFractionalSlotConfig(0.25)
  }
  if (imageCount === 3) {
    return createFractionalSlotConfig(1 / 6)
  }
  return createFractionalSlotConfig(0.25)
}

async function prepareNonTextBlock(
  rawBlock: unknown,
  blockIndex: number,
  getImage: GetImageFn,
): Promise<Exclude<PreparedPageContentBlock, PreparedPortableTextBlock> | null> {
  const blockRecord = asRecord(rawBlock)
  const blockType = nonEmpty(blockRecord._type)
  const blockKey = normalizeBlockKey(blockRecord._key, `block-${blockIndex}`)

  if (blockType === 'pageSpacerBlock') {
    const level = Number(blockRecord.level)
    const safeLevel = Number.isInteger(level) && level >= 1 && level <= 6 ? level : 1

    return {
      _key: blockKey,
      _type: 'pageSpacerBlock',
      level: safeLevel as PreparedSpacerBlock['level'],
    }
  }

  if (blockType === 'pageFullImageGroupBlock' || blockType === 'pageHalfImageGroupBlock') {
    const layout = blockType === 'pageHalfImageGroupBlock' ? 'half' : 'full'
    const rawImages = Array.isArray(blockRecord.images) ? blockRecord.images.slice(0, 4) : []
    const slotConfig = resolveImageGroupSlot(layout, rawImages.length)
    const images = (
      await Promise.all(rawImages.map((image) => createImagePayload(image, slotConfig, getImage)))
    ).filter((image): image is PreparedImage => image !== null)

    if (images.length === 0) {
      return null
    }

    const captionTitle = nonEmpty(blockRecord.captionTitle)
    const captionDescription = nonEmpty(blockRecord.captionDescription)

    return {
      _key: blockKey,
      _type: 'pageImageGroupBlock',
      layout,
      images,
      caption:
        layout === 'half' && (captionTitle || captionDescription)
          ? {
              title: captionTitle,
              description: captionDescription,
            }
          : null,
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

function preparePortableTextObjectBlock(
  rawBlock: unknown,
  blockIndex: number,
): PreparedPortableTextBlock | null {
  const blockRecord = asRecord(rawBlock)
  if (nonEmpty(blockRecord._type) !== 'pagePortableTextBlock') {
    return null
  }

  const blockKey = normalizeBlockKey(blockRecord._key, `block-${blockIndex}`)
  const body = normalizePortableTextNodes(blockRecord.body, blockKey)

  if (body.length === 0) {
    return null
  }

  return {
    _key: blockKey,
    _type: 'portableTextBlock',
    body,
  }
}

export async function preparePageContent(
  rawSiteSettings: unknown,
  getImage: GetImageFn,
): Promise<PreparedPageContent | null> {
  if (!rawSiteSettings || typeof rawSiteSettings !== 'object') {
    return null
  }

  const siteSettingsRecord = asRecord(rawSiteSettings)
  const sectionRefs = Array.isArray(siteSettingsRecord.sections) ? siteSettingsRecord.sections : []

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
          mergePortableTextNodesIntoContent(
            content,
            pendingPortableTextNodes,
            `portable-${sectionKey}-${blockIndex}`,
          )

          const portableTextBlock = preparePortableTextObjectBlock(rawBlock, blockIndex)
          if (portableTextBlock) {
            content.push(portableTextBlock)
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
    contact: await prepareStandaloneContactSection(siteSettingsRecord.contact, getImage),
  }
}

async function prepareStandaloneContactSection(
  rawContact: unknown,
  getImage: GetImageFn,
): Promise<PreparedContactSection | null> {
  const contactRecord = asRecord(rawContact)
  const bioText = toPortableTextBlock(contactRecord.bioText, 'site-settings-contact-text-0')

  const bioImage = await createImagePayload(contactRecord.bioImage, SLOT_CONFIGS.half, getImage)

  const formAction = nonEmpty(contactRecord.formAction)
  const form =
    formAction !== null
      ? {
          heading: nonEmpty(contactRecord.formTitle) ?? 'Request & Purchase',
          formAction,
        }
      : null

  if (bioText === null && bioImage === null && form === null) {
    return null
  }

  return {
    sectionId: 'section-contact-site-settings-contact',
    navLabel: 'CONTACT',
    title: 'Contact',
    bioText,
    bioImage,
    form,
  }
}

function toPortableTextBlock(value: unknown, key: string): PreparedPortableTextBlock | null {
  return portableTextBlockFromPlainText(value, key)
}
