import {createReadStream} from 'node:fs'
import {access, readFile} from 'node:fs/promises'
import path from 'node:path'
import {getCliClient} from 'sanity/cli'

const DEFAULT_SOURCE_PATH = '/Users/alex/dev/kite/public/content.json'
const DOCUMENT_ID = 'siteContent'
const DOCUMENT_TYPE = 'siteContent'
const SANITY_API_VERSION = '2026-02-09'

type LegacyProject = {
  title: string
  materials: string
  location?: string
  description?: string
  main_image?: string
  secondary_image?: string
  extra_image?: string
  gallery?: string[]
  gallery_vertical?: string[]
}

type LegacyContent = {
  about: {
    main_image: string
    text_1: string
    notation_image: string
    text_2: string
  }
  scent: {
    main_image: string
    title: string
    description: string
    details: string
    comparison_images: string[]
  }
  process: {
    text_1: string
    text_2: string
    text_3: string
    gallery_images: string[]
  }
  studio: {
    header_images: string[]
    intro_text: string
    projects: LegacyProject[]
  }
  contact: {
    bio_text: string
    bio_image: string
    form_action: string
  }
}

type CliArgs = {
  dryRun: boolean
  sourcePath: string
  publicDir: string
}

type SanityImageField = {
  _type: 'image'
  asset: {
    _type: 'reference'
    _ref: string
  }
}

const args = parseArgs(process.argv.slice(2))

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Import failed: ${message}`)
  process.exitCode = 1
})

async function main() {
  const rawContent = await readLegacyContent(args.sourcePath)
  const content = validateLegacyContent(rawContent)
  const imagePaths = collectImagePaths(content)

  await assertImageFilesExist(imagePaths, args.publicDir)

  if (args.dryRun) {
    console.log('Dry run succeeded.')
    console.log(`Source: ${args.sourcePath}`)
    console.log(`Image paths verified: ${imagePaths.length}`)
    console.log(`Projects found: ${content.studio.projects.length}`)
    return
  }

  const client = getCliClient({apiVersion: SANITY_API_VERSION})
  const toImageField = createImageUploader(client, args.publicDir)
  const document = await mapDocument(content, toImageField)

  await client.createOrReplace(document)

  console.log('Import completed.')
  console.log(`Document: ${DOCUMENT_ID}`)
  console.log(`Images uploaded or reused in-run: ${imagePaths.length}`)
}

function parseArgs(argv: string[]): CliArgs {
  const parsed: CliArgs = {
    dryRun: false,
    sourcePath: DEFAULT_SOURCE_PATH,
    publicDir: path.dirname(DEFAULT_SOURCE_PATH),
  }

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--dry-run') {
      parsed.dryRun = true
      continue
    }

    if (arg === '--source') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('Missing value for --source')
      }
      parsed.sourcePath = nextValue
      parsed.publicDir = path.dirname(nextValue)
      index += 1
      continue
    }

    if (arg.startsWith('--source=')) {
      const value = arg.split('=')[1]
      if (!value) {
        throw new Error('Missing value for --source')
      }
      parsed.sourcePath = value
      parsed.publicDir = path.dirname(value)
      continue
    }

    if (arg === '--public-dir') {
      const nextValue = argv[index + 1]
      if (!nextValue) {
        throw new Error('Missing value for --public-dir')
      }
      parsed.publicDir = nextValue
      index += 1
      continue
    }

    if (arg.startsWith('--public-dir=')) {
      const value = arg.split('=')[1]
      if (!value) {
        throw new Error('Missing value for --public-dir')
      }
      parsed.publicDir = value
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return parsed
}

async function readLegacyContent(sourcePath: string): Promise<unknown> {
  const fileContent = await readFile(sourcePath, 'utf8')
  return JSON.parse(fileContent)
}

function validateLegacyContent(input: unknown): LegacyContent {
  const root = expectObject(input, 'content')

  const about = expectObject(root.about, 'about')
  const scent = expectObject(root.scent, 'scent')
  const process = expectObject(root.process, 'process')
  const studio = expectObject(root.studio, 'studio')
  const contact = expectObject(root.contact, 'contact')

  const projectsRaw = expectArray(studio.projects, 'studio.projects')
  const projects = projectsRaw.map((projectRaw, projectIndex) => {
    const project = expectObject(projectRaw, `studio.projects[${projectIndex}]`)

    return {
      title: expectString(project.title, `studio.projects[${projectIndex}].title`),
      materials: expectString(project.materials, `studio.projects[${projectIndex}].materials`),
      location: optionalString(project.location, `studio.projects[${projectIndex}].location`),
      description: optionalString(project.description, `studio.projects[${projectIndex}].description`),
      main_image: optionalImagePath(project.main_image, `studio.projects[${projectIndex}].main_image`),
      secondary_image: optionalImagePath(
        project.secondary_image,
        `studio.projects[${projectIndex}].secondary_image`
      ),
      extra_image: optionalImagePath(project.extra_image, `studio.projects[${projectIndex}].extra_image`),
      gallery: optionalImagePathArray(project.gallery, `studio.projects[${projectIndex}].gallery`),
      gallery_vertical: optionalImagePathArray(
        project.gallery_vertical,
        `studio.projects[${projectIndex}].gallery_vertical`
      ),
    } satisfies LegacyProject
  })

  const formAction = expectString(contact.form_action, 'contact.form_action')
  validateUrl(formAction, 'contact.form_action')

  return {
    about: {
      main_image: expectImagePath(about.main_image, 'about.main_image'),
      text_1: expectString(about.text_1, 'about.text_1'),
      notation_image: expectImagePath(about.notation_image, 'about.notation_image'),
      text_2: expectString(about.text_2, 'about.text_2'),
    },
    scent: {
      main_image: expectImagePath(scent.main_image, 'scent.main_image'),
      title: expectString(scent.title, 'scent.title'),
      description: expectString(scent.description, 'scent.description'),
      details: expectString(scent.details, 'scent.details'),
      comparison_images: expectImagePathArray(scent.comparison_images, 'scent.comparison_images'),
    },
    process: {
      text_1: expectString(process.text_1, 'process.text_1'),
      text_2: expectString(process.text_2, 'process.text_2'),
      text_3: expectString(process.text_3, 'process.text_3'),
      gallery_images: expectImagePathArray(process.gallery_images, 'process.gallery_images'),
    },
    studio: {
      header_images: expectImagePathArray(studio.header_images, 'studio.header_images'),
      intro_text: expectString(studio.intro_text, 'studio.intro_text'),
      projects,
    },
    contact: {
      bio_text: expectString(contact.bio_text, 'contact.bio_text'),
      bio_image: expectImagePath(contact.bio_image, 'contact.bio_image'),
      form_action: formAction,
    },
  }
}

function expectObject(value: unknown, fieldPath: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${fieldPath} must be an object`)
  }
  return value as Record<string, unknown>
}

function expectArray(value: unknown, fieldPath: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`${fieldPath} must be an array`)
  }
  return value
}

function expectString(value: unknown, fieldPath: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldPath} must be a string`)
  }
  return value
}

function optionalString(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return expectString(value, fieldPath)
}

function expectImagePath(value: unknown, fieldPath: string): string {
  const imagePath = expectString(value, fieldPath)
  if (!imagePath.startsWith('/')) {
    throw new Error(`${fieldPath} must start with "/"`)
  }
  return imagePath
}

function optionalImagePath(value: unknown, fieldPath: string): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return expectImagePath(value, fieldPath)
}

function expectImagePathArray(value: unknown, fieldPath: string): string[] {
  const arrayValue = expectArray(value, fieldPath)
  return arrayValue.map((item, index) => expectImagePath(item, `${fieldPath}[${index}]`))
}

function optionalImagePathArray(value: unknown, fieldPath: string): string[] | undefined {
  if (value === undefined || value === null) {
    return undefined
  }
  return expectImagePathArray(value, fieldPath)
}

function validateUrl(value: string, fieldPath: string) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('Unsupported URL protocol')
    }
  } catch {
    throw new Error(`${fieldPath} must be a valid http/https URL`)
  }
}

function collectImagePaths(content: LegacyContent): string[] {
  const allPaths = new Set<string>()
  const pushPath = (sourcePath: string | undefined) => {
    if (sourcePath) {
      allPaths.add(sourcePath)
    }
  }
  const pushArray = (sourcePaths: string[] | undefined) => {
    sourcePaths?.forEach((sourcePath) => allPaths.add(sourcePath))
  }

  pushPath(content.about.main_image)
  pushPath(content.about.notation_image)

  pushPath(content.scent.main_image)
  pushArray(content.scent.comparison_images)

  pushArray(content.process.gallery_images)

  pushArray(content.studio.header_images)
  content.studio.projects.forEach((project) => {
    pushPath(project.main_image)
    pushPath(project.secondary_image)
    pushPath(project.extra_image)
    pushArray(project.gallery)
    pushArray(project.gallery_vertical)
  })

  pushPath(content.contact.bio_image)

  return [...allPaths]
}

function resolveImagePath(publicDir: string, sourcePath: string): string {
  const relativePath = sourcePath.replace(/^\/+/, '')
  const publicRoot = path.resolve(publicDir)
  const fullPath = path.resolve(publicRoot, relativePath)

  if (!fullPath.startsWith(`${publicRoot}${path.sep}`) && fullPath !== publicRoot) {
    throw new Error(`Image path escapes public dir: ${sourcePath}`)
  }

  return fullPath
}

async function assertImageFilesExist(imagePaths: string[], publicDir: string) {
  const missingPaths: string[] = []
  for (const imagePath of imagePaths) {
    const fullPath = resolveImagePath(publicDir, imagePath)
    try {
      await access(fullPath)
    } catch {
      missingPaths.push(imagePath)
    }
  }

  if (missingPaths.length > 0) {
    throw new Error(`Missing image files: ${missingPaths.join(', ')}`)
  }
}

function createImageUploader(client: ReturnType<typeof getCliClient>, publicDir: string) {
  const uploadCache = new Map<string, Promise<SanityImageField>>()

  return async function toImageField(sourcePath: string): Promise<SanityImageField> {
    const cachedUpload = uploadCache.get(sourcePath)
    if (cachedUpload) {
      return cachedUpload
    }

    const uploadPromise = (async () => {
      const fullPath = resolveImagePath(publicDir, sourcePath)
      const uploadedAsset = await client.assets.upload('image', createReadStream(fullPath), {
        filename: path.basename(fullPath),
      })

      return {
        _type: 'image',
        asset: {
          _type: 'reference',
          _ref: uploadedAsset._id,
        },
      }
    })()

    uploadCache.set(sourcePath, uploadPromise)
    return uploadPromise
  }
}

async function mapImageArray(
  imagePaths: string[],
  keyPrefix: string,
  toImageField: (imagePath: string) => Promise<SanityImageField>
) {
  const images = []
  for (let index = 0; index < imagePaths.length; index += 1) {
    const sourcePath = imagePaths[index]
    const image = await toImageField(sourcePath)
    images.push({
      ...image,
      _key: `${keyPrefix}-${index}`,
    })
  }
  return images
}

async function mapDocument(
  content: LegacyContent,
  toImageField: (imagePath: string) => Promise<SanityImageField>
) {
  const projects = []
  for (let index = 0; index < content.studio.projects.length; index += 1) {
    const project = content.studio.projects[index]
    const mappedProject: Record<string, unknown> = {
      _type: 'studioProject',
      _key: `project-${index}`,
      title: project.title,
      materials: project.materials,
    }

    if (project.location) {
      mappedProject.location = project.location
    }
    if (project.description) {
      mappedProject.description = project.description
    }
    if (project.main_image) {
      mappedProject.main_image = await toImageField(project.main_image)
    }
    if (project.secondary_image) {
      mappedProject.secondary_image = await toImageField(project.secondary_image)
    }
    if (project.extra_image) {
      mappedProject.extra_image = await toImageField(project.extra_image)
    }
    if (project.gallery && project.gallery.length > 0) {
      mappedProject.gallery = await mapImageArray(project.gallery, `project-${index}-gallery`, toImageField)
    }
    if (project.gallery_vertical && project.gallery_vertical.length > 0) {
      mappedProject.gallery_vertical = await mapImageArray(
        project.gallery_vertical,
        `project-${index}-gallery-vertical`,
        toImageField
      )
    }

    projects.push(mappedProject)
  }

  return {
    _id: DOCUMENT_ID,
    _type: DOCUMENT_TYPE,
    about: {
      _type: 'aboutSection',
      main_image: await toImageField(content.about.main_image),
      text_1: content.about.text_1,
      notation_image: await toImageField(content.about.notation_image),
      text_2: content.about.text_2,
    },
    scent: {
      _type: 'scentSection',
      main_image: await toImageField(content.scent.main_image),
      title: content.scent.title,
      description: content.scent.description,
      details: content.scent.details,
      comparison_images: await mapImageArray(
        content.scent.comparison_images,
        'scent-comparison',
        toImageField
      ),
    },
    process: {
      _type: 'processSection',
      text_1: content.process.text_1,
      text_2: content.process.text_2,
      text_3: content.process.text_3,
      gallery_images: await mapImageArray(content.process.gallery_images, 'process-gallery', toImageField),
    },
    studio: {
      _type: 'studioSection',
      header_images: await mapImageArray(content.studio.header_images, 'studio-header', toImageField),
      intro_text: content.studio.intro_text,
      projects,
    },
    contact: {
      _type: 'contactSection',
      bio_text: content.contact.bio_text,
      bio_image: await toImageField(content.contact.bio_image),
      form_action: content.contact.form_action,
    },
  }
}
