import type {getImage as astroGetImage} from 'astro:assets'

type PreparedImageSource = {
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

type RasterFormat = 'jpg' | 'png'

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

type GetImageFn = typeof astroGetImage

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

function resolveFallbackFormat(src: string): RasterFormat {
  try {
    const pathname = new URL(src).pathname.toLowerCase()
    if (pathname.endsWith('.png')) {
      return 'png'
    }
  } catch {
    if (src.toLowerCase().endsWith('.png')) {
      return 'png'
    }
  }

  return 'jpg'
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

  const widths = clampWidths(slotConfig.widths, dimensions.width)
  const targetWidth = widths[widths.length - 1] ?? dimensions.width
  const targetHeight = Math.max(1, Math.round((dimensions.height / dimensions.width) * targetWidth))
  const fallbackImage = await getImage({
    src: fallbackSrc,
    alt,
    width: targetWidth,
    height: targetHeight,
    widths,
    sizes: slotConfig.sizes,
    format: resolveFallbackFormat(fallbackSrc),
    ...(resolveFallbackFormat(fallbackSrc) === 'jpg' ? {quality: 85, background: '#ffffff'} : {}),
  })

  return {
    alt,
    fallbackSrc: fallbackImage.src,
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
