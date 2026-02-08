import type {APIRoute} from 'astro'

function getRobotsTxt(site: URL | undefined) {
  const lines = ['User-agent: *', 'Allow: /']

  if (site) {
    const sitemapURL = new URL('sitemap-index.xml', site)
    lines.push('', `Sitemap: ${sitemapURL.href}`)
  }

  return `${lines.join('\n')}\n`
}

export const GET: APIRoute = ({site}) =>
  new Response(getRobotsTxt(site), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
