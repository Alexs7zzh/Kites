# Kites Monorepo

## Apps
- web: Astro frontend
- studio: Sanity Studio
- shopify: Shopify theme scaffold for the migration target

## Common Commands
- `pnpm install`
- `pnpm dev:web`
- `pnpm dev:studio`
- `pnpm build:web`
- `pnpm build:studio`
- `pnpm lint`
- `pnpm shopify:theme:check`
- `pnpm shopify:migrate`

## Shopify Migration Workspace

The Shopify migration target lives in `/Users/alex/dev/kites/shopify`.

Automation scripts for content/model sync live in `/Users/alex/dev/kites/scripts/shopify` and use:

- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_API_VERSION`
- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`

The homepage storefront now uses Shopify theme sections directly:

- repeatable top-level `Content section` sections
- one top-level `Contact` section
- section block editing in the Shopify theme editor
- no Shopify metaobjects required for homepage rendering

## Web Sanity Environment

The web app requires these environment variables:

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`

Sanity client runtime values are pinned in code:

- `SANITY_API_VERSION = 2026-02-09`
- `SANITY_USE_CDN = false`

Set these values in your local `/Users/alex/dev/kites/web/.env` file (not committed).

## Deploy Sanity Studio (Hosted)

Run the Studio deploy flow locally:

1. `pnpm -C /Users/alex/dev/kites/studio exec sanity projects list`
2. `pnpm -C /Users/alex/dev/kites/studio build`
3. `pnpm -C /Users/alex/dev/kites/studio run deploy`

Hosted Studio URLs use:

- `https://<hostname>.sanity.studio`
