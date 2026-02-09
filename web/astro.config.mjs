import {createClient} from '@sanity/client'
import {defineConfig} from 'astro/config'
import react from '@astrojs/react'
import sitemap from '@astrojs/sitemap'
import {SANITY_API_VERSION, SANITY_USE_CDN} from './src/lib/sanityConfig.js'

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

function getOptionalEnv(name) {
  const rawValue = process.env[name]
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    return null
  }
  return rawValue.trim()
}

function getSanityClientConfig() {
  const projectId = getOptionalEnv('PUBLIC_SANITY_PROJECT_ID')
  const dataset = getOptionalEnv('PUBLIC_SANITY_DATASET')

  if (!projectId || !dataset) {
    return null
  }

  return {
    projectId,
    dataset,
    apiVersion: SANITY_API_VERSION,
    useCdn: SANITY_USE_CDN,
  }
}

function isHomepageUrl(value) {
  try {
    const url = new URL(value)
    return url.pathname === '/'
  } catch {
    return false
  }
}

let homepageNoindexPromise

async function getHomepageNoindex() {
  if (homepageNoindexPromise) {
    return homepageNoindexPromise
  }

  homepageNoindexPromise = (async () => {
    const sanityClientConfig = getSanityClientConfig()
    if (!sanityClientConfig) {
      return false
    }

    try {
      const client = createClient(sanityClientConfig)
      const response = await client.fetch(`*[_id == "siteContent"][0]{
        "noindex": seo.noindex
      }`)
      return response?.noindex === true
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      console.warn(
        `Sitemap noindex check failed, keeping homepage in sitemap. Reason: ${message}`
      )
      return false
    }
  })()

  return homepageNoindexPromise
}

export default defineConfig({
  site: siteUrl,
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
