import type {getImage as astroGetImage} from 'astro:assets'

type GetImageFn = typeof astroGetImage

type ImageDimensions = {
  width: number
  height: number
}

type OgImageRecord = {
  url?: unknown
  metadata?: {
    dimensions?: {
      width?: unknown
      height?: unknown
    }
  }
}

export type PreparedOgImage = {
  src: string
  width: number
  height: number
}

type PrepareOgImageOptions = {
  image: unknown
  getImage: GetImageFn
  maxDimension?: number
}

const DEFAULT_MAX_DIMENSION = 1200

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

function getTargetDimensions(
  source: ImageDimensions,
  maxDimension: number,
): ImageDimensions {
  const longestEdge = Math.max(source.width, source.height)
  if (longestEdge <= maxDimension) {
    return source
  }

  const scale = maxDimension / longestEdge
  return {
    width: Math.max(1, Math.round(source.width * scale)),
    height: Math.max(1, Math.round(source.height * scale)),
  }
}

async function resolveDimensions(
  imageRecord: OgImageRecord,
  src: string,
  getImage: GetImageFn,
): Promise<ImageDimensions | null> {
  const width = toPositiveInteger(imageRecord.metadata?.dimensions?.width)
  const height = toPositiveInteger(imageRecord.metadata?.dimensions?.height)

  if (width !== null && height !== null) {
    return {width, height}
  }

  try {
    const inferredImage = await getImage({
      src,
      alt: '',
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
    console.error(`Failed to infer OG image dimensions for ${src}: ${message}`)
    return null
  }
}

export async function prepareOgImage({
  image,
  getImage,
  maxDimension = DEFAULT_MAX_DIMENSION,
}: PrepareOgImageOptions): Promise<PreparedOgImage | null> {
  if (!image || typeof image !== 'object') {
    return null
  }

  const imageRecord = image as OgImageRecord
  const src = nonEmpty(imageRecord.url)
  if (!src) {
    return null
  }

  const dimensions = await resolveDimensions(imageRecord, src, getImage)
  if (!dimensions) {
    return null
  }

  const targetDimensions = getTargetDimensions(dimensions, maxDimension)

  try {
    const transformedImage = await getImage({
      src,
      alt: '',
      width: targetDimensions.width,
      height: targetDimensions.height,
      format: 'jpg',
      quality: 80,
      background: '#ffffff',
    })

    return {
      src: transformedImage.src,
      width: targetDimensions.width,
      height: targetDimensions.height,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`Failed to prepare OG image for ${src}: ${message}`)
    return null
  }
}
