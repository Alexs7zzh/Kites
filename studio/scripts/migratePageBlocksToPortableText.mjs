import {createClient} from '@sanity/client'

const PROJECT_ID = 'wmjirbvx'
const DATASET = 'production'
const API_VERSION = '2026-02-28'

function hasFlag(flag) {
  return process.argv.includes(flag)
}

const shouldExecute = hasFlag('--execute')
const token = process.env.SANITY_API_TOKEN || process.env.SANITY_AUTH_TOKEN || ''

if (!token) {
  console.error('Missing SANITY_API_TOKEN (or SANITY_AUTH_TOKEN).')
  process.exit(1)
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token,
  useCdn: false,
})

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
    return [
      {
        _type: 'block',
        _key: `${keyPrefix}-node-0`,
        style: 'normal',
        markDefs: [],
        children: [
          {
            _type: 'span',
            _key: `${keyPrefix}-node-0-span-0`,
            text: ' ',
            marks: [],
          },
        ],
      },
    ]
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

function transformSectionContent(content) {
  if (!Array.isArray(content)) {
    return {content: [], changed: false, htmlBlocksConverted: 0, contactBodiesConverted: 0}
  }

  let changed = false
  let htmlBlocksConverted = 0
  let contactBodiesConverted = 0

  const transformedContent = content.map((rawBlock, index) => {
    if (!rawBlock || typeof rawBlock !== 'object') {
      return rawBlock
    }

    const block = rawBlock

    if (block._type === 'pageHtmlBlock') {
      const plainText = htmlToPlainText(nonEmpty(block.html))
      const body = toPortableBodyFromText(plainText, `${block._key || `block-${index}`}-portable`)

      changed = true
      htmlBlocksConverted += 1

      return {
        _type: 'pagePortableTextBlock',
        _key: block._key || `portable-${index}`,
        body,
      }
    }

    if (block._type === 'contactFormBlock') {
      const legacyBodyHtml = nonEmpty(block.bodyHtml)
      const existingBody = normalizePortableBody(block.body)

      if (!legacyBodyHtml && !('bodyHtml' in block)) {
        return block
      }

      if (legacyBodyHtml && existingBody.length === 0) {
        const plainText = htmlToPlainText(legacyBodyHtml)
        const convertedBody = toPortableBodyFromText(
          plainText,
          `${block._key || `contact-${index}`}-body`,
        )

        changed = true
        contactBodiesConverted += 1

        const {bodyHtml: _omitBodyHtml, ...rest} = block
        return {
          ...rest,
          body: convertedBody,
        }
      }

      if ('bodyHtml' in block) {
        changed = true
        const {bodyHtml: _omitBodyHtml, ...rest} = block
        return {
          ...rest,
          body: existingBody,
        }
      }
    }

    return block
  })

  return {
    content: transformedContent,
    changed,
    htmlBlocksConverted,
    contactBodiesConverted,
  }
}

async function main() {
  const sections = await client.fetch(`
    *[_type == "pageSection" && (
      count(content[_type == "pageHtmlBlock"]) > 0 ||
      count(content[_type == "contactFormBlock" && defined(bodyHtml)]) > 0
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
  let totalContactBodiesConverted = 0

  const patches = []

  for (const section of sections) {
    const transformed = transformSectionContent(section.content)
    if (!transformed.changed) {
      continue
    }

    docsChanged += 1
    totalHtmlBlocksConverted += transformed.htmlBlocksConverted
    totalContactBodiesConverted += transformed.contactBodiesConverted

    console.log(
      `${section._id}: htmlBlocks=${transformed.htmlBlocksConverted}, contactBodies=${transformed.contactBodiesConverted}`,
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
  console.log(`- contactFormBlock.bodyHtml converted: ${totalContactBodiesConverted}`)

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
