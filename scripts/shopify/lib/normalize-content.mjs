import {dedupeBy, ensureArray, nonEmpty, slugify} from './shared.mjs'

export const SANITY_PAGE_QUERY = `{
  "siteSettings": *[_id == "siteSettings"][0]{
    siteName,
    defaultDescription,
    canonicalDomain,
    social{
      xHandle,
      instagramHandle
    },
    defaultOgImage{
      alt,
      "url": asset->url
    },
    "contact": contact{
      bioText,
      formTitle,
      "bioImage": bioImage{
        alt,
        "url": asset->url
      }
    },
    "sections": coalesce(sections[]{
      _key,
      "section": @->{
        _id,
        navLabel,
        title,
        "content": coalesce(content[]{
          _key,
          _type,
          _type == "block" => {
            ...,
            markDefs[]{
              ...,
              _type == "link" => {
                _key,
                _type,
                href
              }
            }
          },
          _type == "pagePortableTextBlock" => {
            body[]{
              ...,
              markDefs[]{
                ...,
                _type == "link" => {
                  _key,
                  _type,
                  href
                }
              }
            }
          },
          _type == "pageSpacerBlock" => {
            level
          },
          _type == "pageFullImageGroupBlock" => {
            "images": coalesce(images[]{
              alt,
              "url": asset->url
            }, [])
          },
          _type == "pageHalfImageGroupBlock" => {
            captionTitle,
            captionDescription,
            "images": coalesce(images[]{
              alt,
              "url": asset->url
            }, [])
          }
        }, [])
      }
    }, [])
  }
}`

function asRecord(value) {
  return value && typeof value === 'object' ? value : {}
}

function normalizeMarks(value) {
  return ensureArray(value).filter((mark) => typeof mark === 'string' && mark.trim() !== '')
}

function extractLinkHref(node, mark) {
  const markDefs = ensureArray(node.markDefs)
  const link = markDefs.find((item) => item?._key === mark && item?._type === 'link')
  return nonEmpty(link?.href)
}

function createRichTextTextNode(text, marks = []) {
  const children = []
  let currentText = ''

  for (const character of text) {
    if (character === '\n') {
      if (currentText) {
        children.push({type: 'text', value: currentText})
        currentText = ''
      }
      children.push({type: 'text', value: '\n'})
      continue
    }

    currentText += character
  }

  if (currentText) {
    children.push({type: 'text', value: currentText})
  }

  return children.map((child) => {
    if (child.value === '\n') {
      return {type: 'text', value: ' '}
    }

    let wrapped = child
    if (marks.includes('strong')) {
      wrapped = {type: 'bold', children: [wrapped]}
    }
    if (marks.includes('em')) {
      wrapped = {type: 'italic', children: [wrapped]}
    }

    return wrapped
  })
}

function mapPortableTextNodeToShopify(node) {
  const style = nonEmpty(node?.style) || 'normal'
  const textChildren = ensureArray(node?.children).flatMap((child) => {
    const text = typeof child?.text === 'string' ? child.text : ''
    const marks = normalizeMarks(child?.marks)
    const linkMark = marks.find((mark) => extractLinkHref(node, mark))
    const baseChildren = createRichTextTextNode(text, marks)

    if (!linkMark) {
      return baseChildren
    }

    const href = extractLinkHref(node, linkMark)
    if (!href) {
      return baseChildren
    }

    return [
      {
        type: 'link',
        url: href,
        title: text,
        target: href.startsWith('http') ? '_blank' : null,
        children: baseChildren,
      },
    ]
  })

  if (style === 'h2' || style === 'h3') {
    return {
      type: 'heading',
      level: Number(style.slice(1)),
      children: textChildren.length > 0 ? textChildren : [{type: 'text', value: ''}],
    }
  }

  return {
    type: 'paragraph',
    children: textChildren.length > 0 ? textChildren : [{type: 'text', value: ''}],
  }
}

export function portableTextNodesToShopifyRichText(nodes) {
  return {
    type: 'root',
    children: ensureArray(nodes).map((node) => mapPortableTextNodeToShopify(node)),
  }
}

function plainTextToPortableTextNodes(value, keyPrefix) {
  const normalized = String(value || '').replace(/\r\n/g, '\n').trim()
  if (!normalized) {
    return []
  }

  return normalized
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph, index) => ({
      _type: 'block',
      _key: `${keyPrefix}-${index}`,
      style: 'normal',
      children: [
        {
          _type: 'span',
          _key: `${keyPrefix}-${index}-span`,
          text: paragraph,
          marks: [],
        },
      ],
      markDefs: [],
    }))
}

function flushPendingPortableNodes(blocks, pendingPortableNodes, key) {
  if (pendingPortableNodes.length === 0) {
    return
  }

  blocks.push({
    handle: key,
    type: 'content_block',
    fields: {
      block_type: 'rich_text',
      body: portableTextNodesToShopifyRichText(pendingPortableNodes.splice(0)),
    },
  })
}

function normalizeBlockKey(value, fallback) {
  return nonEmpty(value) || fallback
}

function createImageRecord(image) {
  return {
    alt: nonEmpty(image?.alt),
    url: nonEmpty(image?.url),
  }
}

export function normalizeSiteContent(siteSettings) {
  const siteSettingsRecord = asRecord(siteSettings)
  const sectionRefs = ensureArray(siteSettingsRecord.sections)
  const sections = []
  const allAssets = []

  sectionRefs.forEach((rawSectionRef, sectionIndex) => {
    const sectionRef = asRecord(rawSectionRef)
    const sectionRecord = asRecord(sectionRef.section)
    const navLabel = nonEmpty(sectionRecord.navLabel) || `SECTION ${sectionIndex + 1}`
    const sectionHandle = slugify(navLabel) || `section-${sectionIndex + 1}`
    const rawBlocks = ensureArray(sectionRecord.content)
    const blocks = []
    const pendingPortableNodes = []

    rawBlocks.forEach((rawBlock, blockIndex) => {
      const block = asRecord(rawBlock)
      const blockType = nonEmpty(block._type)
      const blockKey = normalizeBlockKey(block._key, `${sectionHandle}-block-${blockIndex + 1}`)

      if (blockType === 'block') {
        pendingPortableNodes.push(block)
        return
      }

      if (blockType === 'pagePortableTextBlock') {
        flushPendingPortableNodes(blocks, pendingPortableNodes, `${sectionHandle}-${blockKey}-portable`)
        blocks.push({
          handle: `${sectionHandle}-${blockKey}-portable-object`,
          type: 'content_block',
          fields: {
            block_type: 'rich_text',
            body: portableTextNodesToShopifyRichText(ensureArray(block.body)),
          },
        })
        return
      }

      flushPendingPortableNodes(blocks, pendingPortableNodes, `${sectionHandle}-${blockKey}-portable`)

      if (blockType === 'pageSpacerBlock') {
        blocks.push({
          handle: `${sectionHandle}-${blockKey}-spacer`,
          type: 'content_block',
          fields: {
            block_type: 'spacer',
            level: String(block.level ?? 1),
          },
        })
        return
      }

      if (blockType === 'pageFullImageGroupBlock' || blockType === 'pageHalfImageGroupBlock') {
        const images = ensureArray(block.images)
          .map((image) => createImageRecord(image))
          .filter((image) => image.url)

        allAssets.push(...images)

        blocks.push({
          handle: `${sectionHandle}-${blockKey}-${blockType === 'pageHalfImageGroupBlock' ? 'half' : 'full'}`,
          type: 'content_block',
          fields: {
            block_type: 'image_group',
            layout: blockType === 'pageHalfImageGroupBlock' ? 'half' : 'full',
            images,
            ...(blockType === 'pageHalfImageGroupBlock'
              ? {
                  caption_title: nonEmpty(block.captionTitle),
                  caption_body: nonEmpty(block.captionDescription),
                }
              : {}),
          },
        })
      }
    })

    flushPendingPortableNodes(blocks, pendingPortableNodes, `${sectionHandle}-tail`)

    sections.push({
      handle: sectionHandle,
      navLabel,
      adminTitle: nonEmpty(sectionRecord.title),
      blocks,
    })
  })

  const contactImage = createImageRecord(siteSettingsRecord.contact?.bioImage)
  if (contactImage.url) {
    allAssets.push(contactImage)
  }

  const defaultOgImage = createImageRecord(siteSettingsRecord.defaultOgImage)
  if (defaultOgImage.url) {
    allAssets.push(defaultOgImage)
  }

  return {
    siteName: nonEmpty(siteSettingsRecord.siteName),
    defaultDescription: nonEmpty(siteSettingsRecord.defaultDescription),
    canonicalDomain: nonEmpty(siteSettingsRecord.canonicalDomain),
    social: {
      xHandle: nonEmpty(siteSettingsRecord.social?.xHandle),
      instagramHandle: nonEmpty(siteSettingsRecord.social?.instagramHandle),
    },
    contact: {
      heading: nonEmpty(siteSettingsRecord.contact?.formTitle) || 'Request & Purchase',
      body: portableTextNodesToShopifyRichText(
        plainTextToPortableTextNodes(siteSettingsRecord.contact?.bioText, 'contact-body'),
      ),
      image: contactImage.url ? contactImage : null,
    },
    sections,
    assets: dedupeBy(
      allAssets.filter((asset) => asset.url),
      (asset) => asset.url,
    ),
  }
}
