import type {PreparedPortableTextNode} from './pageContentPreparation'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function sanitizeHref(value: string): string | null {
  const href = value.trim()
  if (!href) {
    return null
  }

  if (href.startsWith('/') || href.startsWith('#')) {
    return href
  }

  try {
    const url = new URL(href)
    if (
      url.protocol === 'http:' ||
      url.protocol === 'https:' ||
      url.protocol === 'mailto:' ||
      url.protocol === 'tel:'
    ) {
      return href
    }
  } catch {
    return null
  }

  return null
}

function wrapWithMark(content: string, mark: string, markDefs: Map<string, string>): string {
  if (mark === 'strong') {
    return `<strong>${content}</strong>`
  }

  if (mark === 'em') {
    return `<em>${content}</em>`
  }

  if (mark === 'code') {
    return `<code>${content}</code>`
  }

  const href = markDefs.get(mark)
  if (href) {
    return `<a href="${escapeAttribute(href)}" target="_blank" rel="noopener noreferrer">${content}</a>`
  }

  return content
}

function renderNode(node: PreparedPortableTextNode): string {
  const tagByStyle: Record<string, string> = {
    normal: 'p',
    h2: 'h2',
    h3: 'h3',
    blockquote: 'blockquote',
  }

  const tag = tagByStyle[node.style] ?? 'p'
  const markDefs = new Map<string, string>()

  for (const markDef of node.markDefs) {
    if (markDef._type !== 'link') {
      continue
    }

    const href = sanitizeHref(markDef.href)
    if (href) {
      markDefs.set(markDef._key, href)
    }
  }

  const innerHtml = node.children
    .map((span) => {
      let rendered = escapeHtml(span.text)
      for (const mark of span.marks) {
        rendered = wrapWithMark(rendered, mark, markDefs)
      }
      return rendered
    })
    .join('')

  return `<${tag}>${innerHtml}</${tag}>`
}

export function renderPortableTextToHtml(nodes: PreparedPortableTextNode[]): string {
  return nodes.map((node) => renderNode(node)).join('')
}
