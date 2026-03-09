import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'

const DEFAULT_SANITY_API_VERSION = process.env.SANITY_API_VERSION || '2026-02-09'
const DEFAULT_SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-10'
const REPORTS_DIR = path.resolve('/Users/alex/dev/kites/reports/shopify')
let cachedShopifyAccessTokenPromise = null

export const SHOPIFY_METAOBJECT_ACCESS = {
  storefront: 'PUBLIC_READ',
}

export function getRequiredEnv(name) {
  const value = process.env[name]
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value.trim()
}

export function getSanityConfig() {
  return {
    projectId: getRequiredEnv('PUBLIC_SANITY_PROJECT_ID'),
    dataset: getRequiredEnv('PUBLIC_SANITY_DATASET'),
    apiVersion: DEFAULT_SANITY_API_VERSION,
  }
}

export function getShopifyConfig() {
  const storeDomain = getRequiredEnv('SHOPIFY_STORE_DOMAIN').replace(/^https?:\/\//, '')

  return {
    storeDomain,
    adminApiVersion: DEFAULT_SHOPIFY_API_VERSION,
    endpoint: `https://${storeDomain}/admin/api/${DEFAULT_SHOPIFY_API_VERSION}/graphql.json`,
  }
}

async function fetchShopifyAccessTokenFromClientCredentials() {
  const storeDomain = getRequiredEnv('SHOPIFY_STORE_DOMAIN').replace(/^https?:\/\//, '')
  const clientId = getRequiredEnv('SHOPIFY_CLIENT_ID')
  const clientSecret = getRequiredEnv('SHOPIFY_CLIENT_SECRET')
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: 'client_credentials',
  })
  const response = await fetch(`https://${storeDomain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  if (!response.ok) {
    const responseBody = await response.text()
    throw new Error(
      `Shopify token request failed: ${response.status} ${response.statusText}${responseBody ? `\n${responseBody}` : ''}`,
    )
  }

  const payload = await response.json()
  const accessToken =
    typeof payload.access_token === 'string' && payload.access_token.trim() !== ''
      ? payload.access_token.trim()
      : null

  if (!accessToken) {
    throw new Error('Shopify token response did not include an access_token.')
  }

  return accessToken
}

export async function getShopifyAdminAccessToken() {
  const configuredToken = process.env.SHOPIFY_ADMIN_ACCESS_TOKEN
  if (typeof configuredToken === 'string' && configuredToken.trim() !== '' && !configuredToken.includes('your_admin_api_token')) {
    return configuredToken.trim()
  }

  if (!cachedShopifyAccessTokenPromise) {
    cachedShopifyAccessTokenPromise = fetchShopifyAccessTokenFromClientCredentials()
  }

  return cachedShopifyAccessTokenPromise
}

export async function fetchSanity(query) {
  const {projectId, dataset, apiVersion} = getSanityConfig()
  const searchParams = new URLSearchParams({query})
  const response = await fetch(
    `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?${searchParams.toString()}`,
  )

  if (!response.ok) {
    throw new Error(`Sanity request failed: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  if (payload.result === undefined) {
    throw new Error('Sanity response did not include a result payload.')
  }

  return payload.result
}

export async function fetchShopifyAdmin(query, variables = {}) {
  const config = getShopifyConfig()
  const accessToken = await getShopifyAdminAccessToken()
  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'X-Shopify-Access-Token': accessToken,
    },
    body: JSON.stringify({query, variables}),
  })

  if (!response.ok) {
    throw new Error(`Shopify Admin API request failed: ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  if (Array.isArray(payload.errors) && payload.errors.length > 0) {
    throw new Error(`Shopify Admin API transport errors: ${JSON.stringify(payload.errors, null, 2)}`)
  }

  return payload.data
}

export function assertNoUserErrors(operationName, payload) {
  const userErrors = payload?.userErrors ?? []
  if (userErrors.length === 0) {
    return
  }

  throw new Error(
    `${operationName} failed:\n${userErrors
      .map((error) => `- ${error.field?.join('.') || 'unknown'}: ${error.message}`)
      .join('\n')}`,
  )
}

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function ensureArray(value) {
  return Array.isArray(value) ? value : []
}

export function nonEmpty(value) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

export function jsonFieldValue(value) {
  return JSON.stringify(value)
}

export function dedupeBy(items, getKey) {
  const seen = new Set()
  return items.filter((item) => {
    const key = getKey(item)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

export async function writeReport(name, data) {
  await mkdir(REPORTS_DIR, {recursive: true})
  const filePath = path.join(REPORTS_DIR, name)
  await writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8')
  return filePath
}

export function buildHandle(base, index) {
  const safeBase = slugify(base) || 'item'
  return `${safeBase}-${String(index + 1).padStart(2, '0')}`
}
