import {defineConfig} from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'

const FALLBACK_SITE_URL = 'https://example.com/'

function normalizeSiteUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  try {
    const url = new URL(value.trim())
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null
    }
    return url.href.endsWith('/') ? url.href : `${url.href}/`
  } catch {
    return null
  }
}

const siteUrl =
  normalizeSiteUrl(process.env.SITE_URL) ??
  normalizeSiteUrl(process.env.URL) ??
  FALLBACK_SITE_URL

const cacheDir = process.env.NETLIFY_BUILD_BASE
  ? new URL(
      './cache/astro/',
      `file://${process.env.NETLIFY_BUILD_BASE.replace(/\/?$/, '/')}`,
    ).pathname
  : './node_modules/.astro'

function isHomepageUrl(value) {
  try {
    const url = new URL(value)
    return url.pathname === '/'
  } catch {
    return false
  }
}

async function getHomepageNoindex() {
  return false
}

export default defineConfig({
  site: siteUrl,
  cacheDir,
  image: {
    domains: ['cdn.sanity.io'],
  },
  integrations: [
    react(),
    sitemap({
      serialize: async (item) => {
        if (!isHomepageUrl(item.url)) {
          return item
        }

        const homepageNoindex = await getHomepageNoindex()
        return homepageNoindex ? undefined : item
      },
    }),
  ],
})
