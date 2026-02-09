import type {getImage as astroGetImage} from 'astro:assets'

type ImageVariant = {
  src: string
  srcSet: string
}

export type PreparedBackgroundImage = {
  placeholderColor: string
  sizes: string
  avif: ImageVariant
  webp: ImageVariant
  jpeg: ImageVariant
  preload: {
    href: string
    imageSrcSet: string
    imageSizes: string
    type: string
  }
}

type GetImageFn = typeof astroGetImage
type ImageInput = Parameters<GetImageFn>[0]['src']

type PrepareBackgroundImageOptions = {
  src: ImageInput
  getImage: GetImageFn
  sizes?: string
  widths?: number[]
  placeholderColor?: string
}

const DEFAULT_WIDTHS = [640, 960, 1280, 1536, 1920]
const DEFAULT_SIZES = '(max-aspect-ratio: 1920/1140) 168.5vh, 100vw'
const DEFAULT_PLACEHOLDER_COLOR = '#e7e4df'

function clampWidths(widths: number[], maxWidth: number | null): number[] {
  const normalizedWidths = Array.from(
    new Set(widths.map((width) => Math.round(width)).filter((width) => width > 0)),
  ).sort((left, right) => left - right)

  if (maxWidth === null) {
    return normalizedWidths
  }

  const clampedWidths = normalizedWidths.filter((width) => width <= maxWidth)
  if (clampedWidths.length === 0) {
    return [maxWidth]
  }

  if (clampedWidths[clampedWidths.length - 1] !== maxWidth) {
    clampedWidths.push(maxWidth)
  }

  return clampedWidths
}

function resolveSourceWidth(src: ImageInput): number | null {
  if (!src || typeof src !== 'object' || !('width' in src)) {
    return null
  }

  const width = (src as {width?: unknown}).width
  if (typeof width !== 'number' || !Number.isFinite(width) || width <= 0) {
    return null
  }

  return Math.round(width)
}

function buildVariant(image: {
  src: string
  srcSet: {
    attribute?: string
  }
}): ImageVariant {
  return {
    src: image.src,
    srcSet: image.srcSet?.attribute || image.src,
  }
}

export async function prepareBackgroundImage({
  src,
  getImage,
  sizes = DEFAULT_SIZES,
  widths = DEFAULT_WIDTHS,
  placeholderColor = DEFAULT_PLACEHOLDER_COLOR,
}: PrepareBackgroundImageOptions): Promise<PreparedBackgroundImage> {
  const targetWidths = clampWidths(widths, resolveSourceWidth(src))

  const [avifImage, webpImage, jpegImage] = await Promise.all([
    getImage({
      src,
      widths: targetWidths,
      sizes,
      format: 'avif',
      quality: 45,
    }),
    getImage({
      src,
      widths: targetWidths,
      sizes,
      format: 'webp',
      quality: 75,
    }),
    getImage({
      src,
      widths: targetWidths,
      sizes,
      format: 'jpg',
      quality: 75,
      background: placeholderColor,
    }),
  ])

  const avif = buildVariant(avifImage)

  return {
    placeholderColor,
    sizes,
    avif,
    webp: buildVariant(webpImage),
    jpeg: buildVariant(jpegImage),
    preload: {
      href: avif.src,
      imageSrcSet: avif.srcSet,
      imageSizes: sizes,
      type: 'image/avif',
    },
  }
}
