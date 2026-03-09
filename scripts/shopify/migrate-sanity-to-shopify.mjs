import {writeFile} from 'node:fs/promises'
import path from 'node:path'

import {normalizeSiteContent, SANITY_PAGE_QUERY} from './lib/normalize-content.mjs'
import {
  assertNoUserErrors,
  dedupeBy,
  fetchSanity,
  fetchShopifyAdmin,
  nonEmpty,
  slugify,
  writeReport,
} from './lib/shared.mjs'

const FILE_CREATE_MUTATION = `
  mutation FileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        ... on MediaImage {
          id
          fileStatus
          image {
            url
          }
        }
        ... on GenericFile {
          id
          fileStatus
          url
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`

const NODES_QUERY = `
  query Nodes($ids: [ID!]!) {
    nodes(ids: $ids) {
      ... on MediaImage {
        id
        fileStatus
        image {
          url
        }
      }
      ... on GenericFile {
        id
        fileStatus
        url
      }
    }
  }
`

const INDEX_TEMPLATE_PATH = path.resolve('/Users/alex/dev/kites/shopify/templates/index.json')

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function createFiles(assetBatch) {
  if (assetBatch.length === 0) {
    return []
  }

  const payload = await fetchShopifyAdmin(FILE_CREATE_MUTATION, {
    files: assetBatch.map((asset) => ({
      contentType: 'IMAGE',
      duplicateResolutionMode: 'REPLACE',
      filename: asset.filename,
      alt: asset.alt || undefined,
      originalSource: asset.url,
    })),
  })

  assertNoUserErrors('fileCreate', payload.fileCreate)
  return payload.fileCreate.files
}

async function waitForFiles(fileIds) {
  const pendingIds = [...fileIds]
  const resolvedFiles = new Map()

  while (pendingIds.length > 0) {
    const payload = await fetchShopifyAdmin(NODES_QUERY, {ids: pendingIds})
    pendingIds.length = 0

    for (const node of payload.nodes ?? []) {
      if (!node?.id) {
        continue
      }

      if (node.fileStatus === 'READY') {
        resolvedFiles.set(node.id, node)
        continue
      }

      pendingIds.push(node.id)
    }

    if (pendingIds.length > 0) {
      await delay(1500)
    }
  }

  return resolvedFiles
}

function buildAssetSeed(assets) {
  return dedupeBy(
    assets
      .filter((asset) => asset?.url)
      .map((asset, index) => ({
        url: asset.url,
        alt: asset.alt || undefined,
        filename: (() => {
          const pathname = new URL(asset.url).pathname
          const extensionMatch = pathname.match(/\.[a-z0-9]+$/i)
          const extension = extensionMatch ? extensionMatch[0].toLowerCase() : '.jpg'
          return `${String(index + 1).padStart(3, '0')}-${slugify(asset.alt || 'asset') || 'asset'}${extension}`
        })(),
      })),
    (asset) => asset.url,
  )
}

async function uploadAssets(assets, report) {
  const assetSeed = buildAssetSeed(assets)
  const createdFiles = await createFiles(assetSeed)
  const fileMap = new Map()

  createdFiles.forEach((file, index) => {
    const seed = assetSeed[index]
    if (seed && file?.id) {
      fileMap.set(seed.url, {
        id: file.id,
        filename: seed.filename,
        settingValue: `shopify://shop_images/${seed.filename}`,
      })
      report.files.created.push(seed.url)
    }
  })

  const readyFiles = await waitForFiles(
    createdFiles
      .map((file) => file?.id)
      .filter(Boolean),
  )

  for (const [url, fileRecord] of fileMap.entries()) {
    if (!readyFiles.has(fileRecord.id)) {
      throw new Error(`File upload did not finish for ${url}`)
    }
  }

  return fileMap
}

function clampSpacingLevel(value) {
  const numericValue = Number.parseInt(String(value || '1'), 10)
  if (!Number.isFinite(numericValue)) {
    return '1'
  }

  return String(Math.min(6, Math.max(1, numericValue)))
}

function buildImageSettings(images, fileRefsByUrl) {
  const uploadedImages = images
    .map((image) => fileRefsByUrl.get(image.url)?.settingValue)
    .filter(Boolean)
    .slice(0, 4)

  return {
    image_1: uploadedImages[0] || '',
    image_2: uploadedImages[1] || '',
    image_3: uploadedImages[2] || '',
    image_4: uploadedImages[3] || '',
  }
}

function mapContentBlockToThemeBlock(block, fileRefsByUrl) {
  const blockType = block.fields?.block_type

  if (blockType === 'rich_text') {
    return {
      type: 'rich_text',
      settings: {
        body: block.fields.body_html || '',
        spacing_above: '1',
        spacing_below: '1',
      },
    }
  }

  if (blockType === 'image_group') {
    const layout = block.fields.layout === 'half' ? 'half_image_group' : 'full_image_group'

    return {
      type: layout,
      settings: {
        ...buildImageSettings(block.fields.images || [], fileRefsByUrl),
        caption_title: layout === 'half_image_group' ? nonEmpty(block.fields.caption_title) || '' : '',
        caption_body: layout === 'half_image_group' ? nonEmpty(block.fields.caption_body) || '' : '',
        spacing_above: '1',
        spacing_below: '1',
      },
    }
  }

  return null
}

function applySpacerSettings(blocks, fileRefsByUrl) {
  const themeBlocks = []
  let pendingTopSpacing = '1'

  for (const block of blocks) {
    if (block.fields?.block_type === 'spacer') {
      const level = clampSpacingLevel(block.fields.level)

      if (themeBlocks.length === 0) {
        pendingTopSpacing = level
        continue
      }

      themeBlocks[themeBlocks.length - 1].settings.spacing_below = level
      continue
    }

    const themeBlock = mapContentBlockToThemeBlock(block, fileRefsByUrl)
    if (!themeBlock) {
      continue
    }

    themeBlock.settings.spacing_above = pendingTopSpacing
    pendingTopSpacing = '1'
    themeBlocks.push(themeBlock)
  }

  return themeBlocks
}

function buildTemplateBlockId(sectionLabel, blockIndex, blockType) {
  const safeLabel = slugify(sectionLabel) || 'section'
  const safeType = slugify(blockType) || 'block'
  return `${safeLabel}-${safeType}-${String(blockIndex + 1).padStart(2, '0')}`
}

function buildContentSection(section, sectionIndex, fileRefsByUrl) {
  const themeBlocks = applySpacerSettings(section.blocks, fileRefsByUrl)
  const blocks = {}
  const blockOrder = []

  themeBlocks.forEach((themeBlock, blockIndex) => {
    const blockId = buildTemplateBlockId(section.navLabel, blockIndex, themeBlock.type)
    blocks[blockId] = themeBlock
    blockOrder.push(blockId)
  })

  return {
    type: 'content-section',
    settings: {
      section_label: section.navLabel,
    },
    blocks,
    block_order: blockOrder,
  }
}

function buildContactSection(contact, fileRefsByUrl) {
  return {
    type: 'contact-panel',
    settings: {
      contact_body: contact.body_html || '',
      contact_image: contact.image ? fileRefsByUrl.get(contact.image.url)?.settingValue || '' : '',
      form_heading: contact.heading || 'Request & Purchase',
    },
  }
}

function buildIndexTemplate(normalized, fileRefsByUrl) {
  const sections = {}
  const order = []

  normalized.sections.forEach((section, sectionIndex) => {
    const sectionKey = `content_section_${String(sectionIndex + 1).padStart(2, '0')}`
    sections[sectionKey] = buildContentSection(section, sectionIndex, fileRefsByUrl)
    order.push(sectionKey)
  })

  sections.contact = buildContactSection(normalized.contact, fileRefsByUrl)
  order.push('contact')

  return {
    sections,
    order,
  }
}

async function writeIndexTemplate(indexTemplate) {
  await writeFile(INDEX_TEMPLATE_PATH, `${JSON.stringify(indexTemplate, null, 2)}\n`, 'utf8')
}

async function main() {
  const report = {
    files: {
      created: [],
    },
    template: {
      written: INDEX_TEMPLATE_PATH,
      sectionKeys: [],
    },
    summary: {},
  }

  const sanityResult = await fetchSanity(SANITY_PAGE_QUERY)
  const normalized = normalizeSiteContent(sanityResult.siteSettings)
  const rawSectionCount = Array.isArray(sanityResult.siteSettings?.sections)
    ? sanityResult.siteSettings.sections.length
    : 0
  const rawContentBlockCount = Array.isArray(sanityResult.siteSettings?.sections)
    ? sanityResult.siteSettings.sections.reduce((sum, entry) => {
        const content = Array.isArray(entry?.section?.content) ? entry.section.content : []
        return sum + content.length
      }, 0)
    : 0

  const fileRefsByUrl = await uploadAssets(normalized.assets, report)
  const indexTemplate = buildIndexTemplate(normalized, fileRefsByUrl)
  await writeIndexTemplate(indexTemplate)

  report.template.sectionKeys = indexTemplate.order
  report.summary = {
    rawSectionCount,
    rawContentBlockCount,
    migratedSectionCount: normalized.sections.length,
    migratedBlockCount: normalized.sections.reduce((sum, section) => sum + section.blocks.length, 0),
    contactIncluded: true,
    storefrontModel: 'theme-sections',
    storeFieldsToConfigureManually: [
      'Online Store > Preferences > homepage title',
      'Online Store > Preferences > homepage meta description',
      'Online Store > Preferences > social sharing image',
      'Settings > Domains > primary domain',
      'Theme settings > logo/background/social handles',
    ],
  }

  const reportPath = await writeReport('sanity-to-shopify-report.json', report)
  console.log(`Sanity content migration complete. Template updated at ${INDEX_TEMPLATE_PATH}. Report: ${reportPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
