# Shopify Theme Workspace

This folder contains the custom Shopify theme that replaces the current Astro + Sanity production stack.

## Commands

Run from `/Users/alex/dev/kites`:

- `pnpm shopify:theme:check`
- `pnpm shopify:theme:dev`
- `pnpm shopify:theme:push`
- `pnpm shopify:migrate-content`
- `pnpm shopify:migrate`

## Required environment

Use `/Users/alex/dev/kites/.env.example` as the template for:

- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `SHOPIFY_CLIENT_ID`
- `SHOPIFY_CLIENT_SECRET`
- `SHOPIFY_API_VERSION`
- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`

## Theme assumptions

- Homepage content lives in top-level theme sections and section blocks, not metaobjects.
- Each content section has a `Section label` and free-form blocks in the theme editor.
- The contact area is a separate top-level `Contact` section with `contact_body`, `contact_image`, and `form_heading`.
- Global visuals come from theme settings, with local fallback assets for development.
- Contact submission uses Shopify's native `{% form 'contact' %}` flow.
