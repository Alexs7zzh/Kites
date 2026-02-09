# Kites Monorepo

## Apps
- web: Astro frontend
- studio: Sanity Studio

## Common Commands
- `pnpm install`
- `pnpm dev:web`
- `pnpm dev:studio`
- `pnpm build:web`
- `pnpm build:studio`
- `pnpm lint`

## Web Sanity Environment

The web app requires these environment variables:

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`

Sanity client runtime values are pinned in code:

- `SANITY_API_VERSION = 2026-02-09`
- `SANITY_USE_CDN = false`

Defaults for this project are provided in `/Users/alex/dev/kites/web/.env.example`.

## Deploy Sanity Studio (Hosted)

Run the Studio deploy flow locally:

1. `pnpm -C /Users/alex/dev/kites/studio exec sanity projects list`
2. `pnpm -C /Users/alex/dev/kites/studio build`
3. `pnpm -C /Users/alex/dev/kites/studio run deploy`

Hosted Studio URLs use:

- `https://<hostname>.sanity.studio`
