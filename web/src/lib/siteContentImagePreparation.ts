import type {getImage as astroGetImage} from 'astro:assets'

export type PreparedImageSource = {
  type: 'image/avif' | 'image/webp'
  srcSet: string
}

export type PreparedImage = {
  alt: string
  fallbackSrc: string
  width: number
  height: number
  lqip: string | null
  sizes: string
  sources: PreparedImageSource[]
  loading: 'lazy' | 'eager'
  decoding: 'async' | 'sync'
  fetchPriority: 'auto' | 'high'
}

type SlotConfig = {
  sizes: string
  widths: number[]
  loading: 'lazy' | 'eager'
  decoding: 'async' | 'sync'
  fetchPriority: 'auto' | 'high'
}

type LoadingConfig = Pick<SlotConfig, 'loading' | 'decoding' | 'fetchPriority'>
type SlotConfigResolver = (image: unknown, index: number) => SlotConfig

type ImageRecord = {
  url?: unknown
  alt?: unknown
  metadata?: {
    dimensions?: {
      width?: unknown
      height?: unknown
    }
    lqip?: unknown
  }
}

type ImageDimensions = {
  width: number
  height: number
}

export type GetImageFn = typeof astroGetImage

const DEFAULT_IMAGE_LOADING_CONFIG: LoadingConfig = {
  loading: 'lazy' as const,
  decoding: 'async' as const,
  fetchPriority: 'auto' as const,
}

const HERO_IMAGE_LOADING_CONFIG: LoadingConfig = {
  loading: 'eager' as const,
  decoding: 'sync' as const,
  fetchPriority: 'high' as const,
}

const MOBILE_CONTENT_WIDTH = 'calc(65vw - 40px)'
const DESKTOP_CONTENT_WIDTH_PRE_GUTTER = 'calc(55vw - 160px)'
const DESKTOP_CONTENT_WIDTH_POST_GUTTER =
  'calc((55vw + 236px) - (80px + (80px + 236px)))'

function scaleSize(baseSize: string, factor: number): string {
  return `calc(${baseSize} * ${factor})`
}

const FULL_WIDTH_SIZES =
  `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
  `(max-width: 999px) ${DESKTOP_CONTENT_WIDTH_PRE_GUTTER}, ` +
  `${DESKTOP_CONTENT_WIDTH_POST_GUTTER}`

const FULL_WIDTH_SIZES_THROUGH_1200 =
  `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
  `(max-width: 999px) ${DESKTOP_CONTENT_WIDTH_PRE_GUTTER}, ` +
  `(max-width: 1200px) ${DESKTOP_CONTENT_WIDTH_POST_GUTTER}`

const HALF_WIDTH_SIZES =
  `(max-width: 769px) ${MOBILE_CONTENT_WIDTH}, ` +
  `(max-width: 999px) ${scaleSize(DESKTOP_CONTENT_WIDTH_PRE_GUTTER, 0.5)}, ` +
  `${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.5)}`

function createSlotConfig(
  sizes: string,
  widths: number[],
  loadingConfig: LoadingConfig = DEFAULT_IMAGE_LOADING_CONFIG,
): SlotConfig {
  return {
    sizes,
    widths,
    ...loadingConfig,
  }
}

const SLOT_CONFIGS = {
  aboutMainImage: createSlotConfig(
    HALF_WIDTH_SIZES,
    [320, 640, 768],
    HERO_IMAGE_LOADING_CONFIG,
  ),
  largeImage: createSlotConfig(FULL_WIDTH_SIZES, [480, 768, 1024]),
  responsiveImage: createSlotConfig(FULL_WIDTH_SIZES, [480, 768, 1024]),
  scentComparisonLeft: createSlotConfig(
    `${FULL_WIDTH_SIZES_THROUGH_1200}, ${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.52)}`,
    [320, 480, 640],
  ),
  scentComparisonRight: createSlotConfig(
    `${FULL_WIDTH_SIZES_THROUGH_1200}, ${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.44)}`,
    [280, 440, 600],
  ),
  studioHeaderImage: createSlotConfig(
    `${FULL_WIDTH_SIZES_THROUGH_1200}, ${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.31)}`,
    [220, 340, 520],
  ),
  captionBioImage: createSlotConfig(
    `${FULL_WIDTH_SIZES_THROUGH_1200}, ${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.45)}`,
    [320, 480, 640, 768],
  ),
  projectInlineGallery: createSlotConfig(
    `(max-width: 769px) ${scaleSize(MOBILE_CONTENT_WIDTH, 0.48)}, ` +
      `(max-width: 999px) ${scaleSize(DESKTOP_CONTENT_WIDTH_PRE_GUTTER, 0.48)}, ` +
      `(max-width: 1200px) ${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.48)}, ` +
      `${scaleSize(DESKTOP_CONTENT_WIDTH_POST_GUTTER, 0.216)}`,
    [220, 380, 560],
  ),
}

export const imageProjection = `
  "url": asset->url,
  alt,
  "metadata": asset->metadata{
    dimensions{
      width,
      height
    },
    lqip
  }
`

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

function toPositiveInteger(value: unknown): number | null {
  if (!isPositiveNumber(value)) {
    return null
  }

  return Math.round(value)
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  return trimmedValue === '' ? null : trimmedValue
}

function sanitizeAlt(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function clampWidths(widths: number[], maxWidth: number): number[] {
  const normalizedWidths = Array.from(
    new Set(
      widths
        .map((width) => Math.round(width))
        .filter((width) => isPositiveNumber(width)),
    ),
  ).sort((left, right) => left - right)

  const clampedMaxWidth = Math.round(maxWidth)
  const clampedWidths = normalizedWidths.filter((width) => width <= clampedMaxWidth)

  if (clampedWidths.length === 0) {
    return [clampedMaxWidth]
  }

  if (clampedWidths[clampedWidths.length - 1] !== clampedMaxWidth) {
    clampedWidths.push(clampedMaxWidth)
  }

  return clampedWidths
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

async function resolveImageDimensions(
  imageRecord: ImageRecord,
  fallbackSrc: string,
  alt: string,
  getImage: GetImageFn,
): Promise<ImageDimensions | null> {
  const widthFromMetadata = toPositiveInteger(imageRecord.metadata?.dimensions?.width)
  const heightFromMetadata = toPositiveInteger(imageRecord.metadata?.dimensions?.height)

  if (widthFromMetadata !== null && heightFromMetadata !== null) {
    return {
      width: widthFromMetadata,
      height: heightFromMetadata,
    }
  }

  try {
    const inferredImage = await getImage({
      src: fallbackSrc,
      alt,
      inferSize: true,
    })

    const inferredWidth = toPositiveInteger(inferredImage.options.width)
    const inferredHeight = toPositiveInteger(inferredImage.options.height)

    if (inferredWidth === null || inferredHeight === null) {
      return null
    }

    return {
      width: inferredWidth,
      height: inferredHeight,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to infer image dimensions for ${fallbackSrc}: ${message}`)
    return null
  }
}

async function buildTransformedImageSources(
  fallbackSrc: string,
  alt: string,
  width: number,
  height: number,
  slotConfig: SlotConfig,
  getImage: GetImageFn,
): Promise<PreparedImageSource[]> {
  const widths = clampWidths(slotConfig.widths, width)
  const targetWidth = widths[widths.length - 1] ?? width
  const targetHeight = Math.max(1, Math.round((height / width) * targetWidth))

  const baseImageOptions = {
    src: fallbackSrc,
    alt,
    width: targetWidth,
    height: targetHeight,
    widths,
    sizes: slotConfig.sizes,
  }

  const [avifImage, webpImage] = await Promise.all([
    getImage({
      ...baseImageOptions,
      format: 'avif',
    }),
    getImage({
      ...baseImageOptions,
      format: 'webp',
    }),
  ])

  return [
    {
      type: 'image/avif',
      srcSet: avifImage.srcSet?.attribute || avifImage.src,
    },
    {
      type: 'image/webp',
      srcSet: webpImage.srcSet?.attribute || webpImage.src,
    },
  ]
}

export async function createImagePayload(
  image: unknown,
  slotConfig: SlotConfig,
  getImage: GetImageFn,
): Promise<PreparedImage | null> {
  if (!image || typeof image !== 'object') {
    return null
  }

  const imageRecord = image as ImageRecord
  const fallbackSrc = nonEmpty(imageRecord.url)
  if (!fallbackSrc) {
    return null
  }

  const alt = sanitizeAlt(imageRecord.alt)
  const dimensions = await resolveImageDimensions(imageRecord, fallbackSrc, alt, getImage)
  if (!dimensions) {
    return null
  }

  const sources = await buildTransformedImageSources(
    fallbackSrc,
    alt,
    dimensions.width,
    dimensions.height,
    slotConfig,
    getImage,
  )

  return {
    alt,
    fallbackSrc,
    width: dimensions.width,
    height: dimensions.height,
    lqip: nonEmpty(imageRecord.metadata?.lqip),
    sizes: slotConfig.sizes,
    sources,
    loading: slotConfig.loading,
    decoding: slotConfig.decoding,
    fetchPriority: slotConfig.fetchPriority,
  }
}

async function mapImages(
  images: unknown,
  slotConfigOrResolver: SlotConfig | SlotConfigResolver,
  getImage: GetImageFn,
): Promise<PreparedImage[]> {
  if (!Array.isArray(images)) {
    return []
  }

  const preparedImages = await Promise.all(
    images.map((image, index) => {
      const slotConfig =
        typeof slotConfigOrResolver === 'function'
          ? slotConfigOrResolver(image, index)
          : slotConfigOrResolver
      return createImagePayload(image, slotConfig, getImage)
    }),
  )

  return preparedImages.filter(
    (preparedImage): preparedImage is PreparedImage => preparedImage !== null,
  )
}

async function prepareProject(project: unknown, getImage: GetImageFn) {
  const projectRecord = asRecord(project)

  return {
    ...projectRecord,
    main_image: await createImagePayload(
      projectRecord.main_image,
      SLOT_CONFIGS.captionBioImage,
      getImage,
    ),
    secondary_image: await createImagePayload(
      projectRecord.secondary_image,
      SLOT_CONFIGS.responsiveImage,
      getImage,
    ),
    extra_image: await createImagePayload(
      projectRecord.extra_image,
      SLOT_CONFIGS.responsiveImage,
      getImage,
    ),
    gallery: await mapImages(projectRecord.gallery, SLOT_CONFIGS.projectInlineGallery, getImage),
    gallery_vertical: await mapImages(
      projectRecord.gallery_vertical,
      SLOT_CONFIGS.responsiveImage,
      getImage,
    ),
  }
}

export async function prepareSiteContent(
  rawSiteContent: unknown,
  getImage: GetImageFn,
): Promise<Record<string, unknown> | null> {
  if (!rawSiteContent || typeof rawSiteContent !== 'object') {
    return null
  }

  const siteContentRecord = asRecord(rawSiteContent)
  const aboutRecord = asRecord(siteContentRecord.about)
  const scentRecord = asRecord(siteContentRecord.scent)
  const processRecord = asRecord(siteContentRecord.process)
  const studioRecord = asRecord(siteContentRecord.studio)
  const contactRecord = asRecord(siteContentRecord.contact)

  const projectsRaw = Array.isArray(studioRecord.projects) ? studioRecord.projects : []
  const preparedProjects = await Promise.all(
    projectsRaw.map((project) => prepareProject(project, getImage)),
  )

  return {
    ...siteContentRecord,
    about: {
      ...aboutRecord,
      main_image: await createImagePayload(
        aboutRecord.main_image,
        SLOT_CONFIGS.aboutMainImage,
        getImage,
      ),
      notation_image: await createImagePayload(
        aboutRecord.notation_image,
        SLOT_CONFIGS.largeImage,
        getImage,
      ),
    },
    scent: {
      ...scentRecord,
      main_image: await createImagePayload(
        scentRecord.main_image,
        SLOT_CONFIGS.largeImage,
        getImage,
      ),
      comparison_images: await mapImages(
        scentRecord.comparison_images,
        (_, index) =>
          index === 0 ? SLOT_CONFIGS.scentComparisonLeft : SLOT_CONFIGS.scentComparisonRight,
        getImage,
      ),
    },
    process: {
      ...processRecord,
      gallery_images: await mapImages(
        processRecord.gallery_images,
        SLOT_CONFIGS.responsiveImage,
        getImage,
      ),
    },
    studio: {
      ...studioRecord,
      header_images: await mapImages(
        studioRecord.header_images,
        SLOT_CONFIGS.studioHeaderImage,
        getImage,
      ),
      projects: preparedProjects,
    },
    contact: {
      ...contactRecord,
      bio_image: await createImagePayload(
        contactRecord.bio_image,
        SLOT_CONFIGS.captionBioImage,
        getImage,
      ),
    },
  }
}
