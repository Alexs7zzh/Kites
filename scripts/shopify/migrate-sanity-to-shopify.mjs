import {normalizeSiteContent, SANITY_PAGE_QUERY} from './lib/normalize-content.mjs'
import {
  assertNoUserErrors,
  buildHandle,
  dedupeBy,
  fetchSanity,
  fetchShopifyAdmin,
  jsonFieldValue,
  nonEmpty,
  slugify,
  writeReport,
} from './lib/shared.mjs'

const METAOBJECT_BY_HANDLE_QUERY = `
  query MetaobjectByHandle($type: String!, $handle: String!) {
    metaobjectByHandle(handle: {type: $type, handle: $handle}) {
      id
      handle
      type
    }
  }
`

const METAOBJECT_CREATE_MUTATION = `
  mutation CreateMetaobject($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        id
        handle
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`

const METAOBJECT_UPDATE_MUTATION = `
  mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        id
        handle
        type
      }
      userErrors {
        field
        message
      }
    }
  }
`

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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function ensureMetaobject(type, handle, fields, report) {
  const existingPayload = await fetchShopifyAdmin(METAOBJECT_BY_HANDLE_QUERY, {type, handle})
  const existingMetaobject = existingPayload.metaobjectByHandle
  const input = {
    handle,
    fields,
    capabilities: {
      publishable: {
        status: 'ACTIVE',
      },
    },
  }

  if (!existingMetaobject) {
    const createdPayload = await fetchShopifyAdmin(METAOBJECT_CREATE_MUTATION, {
      metaobject: {
        type,
        ...input,
      },
    })
    assertNoUserErrors('metaobjectCreate', createdPayload.metaobjectCreate)
    report.metaobjects.created.push(`${type}:${handle}`)
    return createdPayload.metaobjectCreate.metaobject
  }

  const updatedPayload = await fetchShopifyAdmin(METAOBJECT_UPDATE_MUTATION, {
    id: existingMetaobject.id,
    metaobject: input,
  })
  assertNoUserErrors('metaobjectUpdate', updatedPayload.metaobjectUpdate)
  report.metaobjects.updated.push(`${type}:${handle}`)
  return updatedPayload.metaobjectUpdate.metaobject
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
      fileMap.set(seed.url, file.id)
      report.files.created.push(seed.url)
    }
  })

  const readyFiles = await waitForFiles(createdFiles.map((file) => file.id).filter(Boolean))
  for (const [url, id] of fileMap.entries()) {
    if (!readyFiles.has(id)) {
      throw new Error(`File upload did not finish for ${url}`)
    }
  }

  return fileMap
}

function toField(key, value) {
  if (value === null || value === undefined) {
    return null
  }

  return {key, value}
}

function createBlockFieldPayload(block, fileIdsByUrl, blockReferenceIds) {
  if (block.type === 'content_block') {
    const imageIds = (block.fields.images || [])
      .map((image) => fileIdsByUrl.get(image.url))
      .filter(Boolean)

    return [
      toField('block_type', block.fields.block_type),
      toField('body', block.fields.body ? jsonFieldValue(block.fields.body) : null),
      toField('level', block.fields.level ? String(block.fields.level) : null),
      toField('layout', nonEmpty(block.fields.layout)),
      toField('images', imageIds.length > 0 ? jsonFieldValue(imageIds) : null),
      toField('caption_title', nonEmpty(block.fields.caption_title)),
      toField('caption_body', nonEmpty(block.fields.caption_body)),
    ].filter(Boolean)
  }

  if (Array.isArray(block.blocks) && typeof block.navLabel === 'string') {
    return [
      toField('nav_label', block.navLabel),
      toField('admin_title', block.adminTitle),
      toField(
        'blocks',
        jsonFieldValue(
          block.blocks
            .map((childBlock) => blockReferenceIds.get(childBlock.handle))
            .filter(Boolean),
        ),
      ),
    ].filter(Boolean)
  }

  return []
}

async function main() {
  const report = {
    files: {
      created: [],
    },
    metaobjects: {
      created: [],
      updated: [],
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
  const fileIdsByUrl = await uploadAssets(normalized.assets, report)
  const blockReferenceIds = new Map()

  for (const section of normalized.sections) {
    for (const [blockIndex, block] of section.blocks.entries()) {
      const blockHandle = buildHandle(block.handle, blockIndex)
      const metaobject = await ensureMetaobject(
        block.type,
        blockHandle,
        createBlockFieldPayload(block, fileIdsByUrl, blockReferenceIds),
        report,
      )
      blockReferenceIds.set(block.handle, metaobject.id)
    }
  }

  const sectionReferenceIds = []
  for (const [sectionIndex, section] of normalized.sections.entries()) {
    const sectionHandle = buildHandle(section.handle, sectionIndex)
    const sectionMetaobject = await ensureMetaobject(
      'page_section',
      sectionHandle,
      createBlockFieldPayload(section, fileIdsByUrl, blockReferenceIds),
      report,
    )
    sectionReferenceIds.push(sectionMetaobject.id)
  }

  await ensureMetaobject(
    'homepage_content',
    'default',
    [
      toField('sections', jsonFieldValue(sectionReferenceIds)),
      toField('contact_body', jsonFieldValue(normalized.contact.body)),
      toField('contact_image', normalized.contact.image ? fileIdsByUrl.get(normalized.contact.image.url) : null),
      toField('contact_form_heading', normalized.contact.heading),
    ].filter(Boolean),
    report,
  )

  report.summary = {
    rawSectionCount,
    rawContentBlockCount,
    migratedSectionCount: normalized.sections.length,
    migratedBlockCount: normalized.sections.reduce((sum, section) => sum + section.blocks.length, 0),
    contactIncluded: true,
    storeFieldsToConfigureManually: [
      'Online Store > Preferences > homepage title',
      'Online Store > Preferences > homepage meta description',
      'Online Store > Preferences > social sharing image',
      'Settings > Domains > primary domain',
      'Theme settings > logo/background/social handles',
    ],
  }

  const reportPath = await writeReport('sanity-to-shopify-report.json', report)
  console.log(`Sanity content migration complete. Report: ${reportPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
