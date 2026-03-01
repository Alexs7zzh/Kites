import {getCliClient} from 'sanity/cli'

const API_VERSION = '2026-03-01'
const shouldExecute = process.argv.includes('--execute')

const client = getCliClient({apiVersion: API_VERSION})

function nonEmpty(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function htmlToPlainText(value) {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/(h1|h2|h3|h4|h5|h6|li|blockquote)>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim()
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

function toPortableBodyFromText(value, keyPrefix) {
  const paragraphs = toParagraphs(value)
  if (paragraphs.length === 0) {
    return []
  }

  return paragraphs.map((paragraph, index) => {
    const nodeKey = `${keyPrefix}-node-${index}`
    return {
      _type: 'block',
      _key: nodeKey,
      style: 'normal',
      markDefs: [],
      children: [
        {
          _type: 'span',
          _key: `${nodeKey}-span-0`,
          text: paragraph,
          marks: [],
        },
      ],
    }
  })
}

function normalizePortableBody(value) {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter((node) => node && typeof node === 'object' && node._type === 'block')
}

function withUniqueKey(item, keySet, fallbackKey) {
  if (!item || typeof item !== 'object') {
    return item
  }

  const baseKey = nonEmpty(item._key) || fallbackKey
  let nextKey = baseKey
  let suffix = 1
  while (keySet.has(nextKey)) {
    nextKey = `${baseKey}-${suffix}`
    suffix += 1
  }

  keySet.add(nextKey)
  if (nextKey === item._key) {
    return item
  }

  return {
    ...item,
    _key: nextKey,
  }
}

function transformSectionContent(content) {
  if (!Array.isArray(content)) {
    return {
      content: [],
      changed: false,
      htmlBlocksConverted: 0,
      textWrappersFlattened: 0,
      contactBodiesConverted: 0,
      contactBodiesInitialized: 0,
    }
  }

  let changed = false
  let htmlBlocksConverted = 0
  let textWrappersFlattened = 0
  let contactBodiesConverted = 0
  let contactBodiesInitialized = 0

  const transformedContent = []
  const keySet = new Set()

  for (const [index, rawBlock] of content.entries()) {
    if (!rawBlock || typeof rawBlock !== 'object') {
      transformedContent.push(rawBlock)
      continue
    }

    const block = rawBlock

    if (block._type === 'pagePortableTextBlock') {
      const body = normalizePortableBody(block.body)
      const wrappedNodes =
        body.length > 0 ? body : toPortableBodyFromText(' ', `${block._key || `portable-${index}`}-fallback`)

      wrappedNodes.forEach((node, nodeIndex) => {
        const nodeWithKey = withUniqueKey(
          node,
          keySet,
          `${block._key || `portable-${index}`}-node-${nodeIndex}`,
        )
        transformedContent.push(nodeWithKey)
      })

      changed = true
      textWrappersFlattened += 1
      continue
    }

    if (block._type === 'pageHtmlBlock') {
      const plainText = htmlToPlainText(nonEmpty(block.html))
      const body = toPortableBodyFromText(plainText, `${block._key || `html-${index}`}-portable`)

      body.forEach((node, nodeIndex) => {
        const nodeWithKey = withUniqueKey(node, keySet, `${block._key || `html-${index}`}-node-${nodeIndex}`)
        transformedContent.push(nodeWithKey)
      })

      changed = true
      htmlBlocksConverted += 1
      continue
    }

    if (block._type === 'contactFormBlock') {
      const legacyBodyHtml = nonEmpty(block.bodyHtml)
      const existingBody = normalizePortableBody(block.body)

      if (legacyBodyHtml && existingBody.length === 0) {
        const plainText = htmlToPlainText(legacyBodyHtml)
        const convertedBody = toPortableBodyFromText(
          plainText,
          `${block._key || `contact-${index}`}-body`,
        )

        const {bodyHtml: _omitBodyHtml, ...rest} = block
        const nextBlock = withUniqueKey(
          {
            ...rest,
            body: convertedBody,
          },
          keySet,
          `contact-${index}`,
        )
        transformedContent.push(nextBlock)
        changed = true
        contactBodiesConverted += 1
        continue
      }

      if (!Array.isArray(block.body)) {
        const {bodyHtml: _omitBodyHtml, ...rest} = block
        const nextBlock = withUniqueKey(
          {
            ...rest,
            body: existingBody,
          },
          keySet,
          `contact-${index}`,
        )
        transformedContent.push(nextBlock)
        changed = true
        contactBodiesInitialized += 1
        continue
      }

      if ('bodyHtml' in block) {
        const {bodyHtml: _omitBodyHtml, ...rest} = block
        const nextBlock = withUniqueKey(rest, keySet, `contact-${index}`)
        transformedContent.push(nextBlock)
        changed = true
        continue
      }
    }

    transformedContent.push(withUniqueKey(block, keySet, `item-${index}`))
  }

  return {
    content: transformedContent,
    changed,
    htmlBlocksConverted,
    textWrappersFlattened,
    contactBodiesConverted,
    contactBodiesInitialized,
  }
}

async function main() {
  const sections = await client.fetch(`
    *[_type == "pageSection" && (
      count(content[_type == "pagePortableTextBlock"]) > 0 ||
      count(content[_type == "pageHtmlBlock"]) > 0 ||
      count(content[_type == "contactFormBlock" && defined(bodyHtml)]) > 0 ||
      count(content[_type == "contactFormBlock" && !defined(body)]) > 0
    )]{
      _id,
      _rev,
      content
    }
  `)

  if (!Array.isArray(sections) || sections.length === 0) {
    console.log('No pageSection documents need conversion.')
    return
  }

  let docsChanged = 0
  let totalHtmlBlocksConverted = 0
  let totalTextWrappersFlattened = 0
  let totalContactBodiesConverted = 0
  let totalContactBodiesInitialized = 0

  const patches = []

  for (const section of sections) {
    const transformed = transformSectionContent(section.content)
    if (!transformed.changed) {
      continue
    }

    docsChanged += 1
    totalHtmlBlocksConverted += transformed.htmlBlocksConverted
    totalTextWrappersFlattened += transformed.textWrappersFlattened
    totalContactBodiesConverted += transformed.contactBodiesConverted
    totalContactBodiesInitialized += transformed.contactBodiesInitialized

    console.log(
      `${section._id}: htmlBlocks=${transformed.htmlBlocksConverted}, wrappers=${transformed.textWrappersFlattened}, contactBodies=${transformed.contactBodiesConverted}, contactBodiesInitialized=${transformed.contactBodiesInitialized}`,
    )

    patches.push({
      _id: section._id,
      _rev: section._rev,
      content: transformed.content,
    })
  }

  console.log('\nSummary:')
  console.log(`- Documents changed: ${docsChanged}`)
  console.log(`- pageHtmlBlock converted: ${totalHtmlBlocksConverted}`)
  console.log(`- pagePortableTextBlock flattened: ${totalTextWrappersFlattened}`)
  console.log(`- contactFormBlock.bodyHtml converted: ${totalContactBodiesConverted}`)
  console.log(`- contactFormBlock.body initialized: ${totalContactBodiesInitialized}`)

  if (!shouldExecute) {
    console.log('\nDry run complete. No writes performed.')
    console.log('Run with --execute to apply changes.')
    return
  }

  let transaction = client.transaction()
  for (const patchItem of patches) {
    transaction = transaction.patch(patchItem._id, (patch) =>
      patch.ifRevisionId(patchItem._rev).set({content: patchItem.content}),
    )
  }

  const result = await transaction.commit({visibility: 'sync'})
  console.log('\nMigration applied successfully.')
  console.log(`Transaction ID: ${result.transactionId}`)
}

main().catch((error) => {
  console.error('Migration failed.')
  console.error(error)
  process.exit(1)
})
