# Shopify Migration Plan Refresh

## What now exists in this repo

- `/Users/alex/dev/kites/web` remains the read-only reference implementation.
- `/Users/alex/dev/kites/shopify` now contains the new custom Shopify theme scaffold.
- `/Users/alex/dev/kites/scripts/shopify` now contains the migration automation for:
  - migrating current Sanity content into Shopify theme sections
  - uploading referenced Sanity images into Shopify Files
- `/Users/alex/dev/kites/.env.example` documents the environment variables needed for the migration scripts.

## Target architecture

Production should end on Shopify only:

1. Theme runtime:
   - custom Shopify theme in `/Users/alex/dev/kites/shopify`
   - homepage rendered from top-level Shopify theme sections
   - left-nav + one-page scroll behavior preserved
   - native Shopify contact form used instead of the current custom POST + Turnstile flow
2. Content model:
   - native Shopify settings for domain/title/meta description/social sharing image
   - theme settings for global visuals and optional social handles
   - theme sections and section blocks for homepage content
3. Decommission target:
   - Sanity Studio removed from the live operational path
   - Astro site removed from the live operational path

## Implemented Shopify content model

### Theme settings

The theme currently exposes:

- `logo_image`
- `background_image`
- `background_placeholder_color`
- `social_x_handle`
- `social_instagram_handle`

### Homepage sections

The homepage now uses true top-level theme sections:

1. repeatable `Content section`
   - `section_label`
   - repeatable section blocks in the same theme editor
2. one `Contact` section
   - `contact_body`
   - `contact_image`
   - `form_heading`

### Content section block types

Each `Content section` supports these block types directly in the theme editor:

1. `Rich text`
   - `body`
   - `spacing_above` (`1` to `6`)
   - `spacing_below` (`1` to `6`)
2. `Full image group`
   - `image_1` to `image_4`
   - `spacing_above` (`1` to `6`)
   - `spacing_below` (`1` to `6`)
3. `Half image group`
   - `image_1` to `image_4`
   - `caption_title`
   - `caption_body`
   - `spacing_above` (`1` to `6`)
   - `spacing_below` (`1` to `6`)

The old standalone spacer block is gone. Sanity spacer blocks are now migrated into `spacing_above` and `spacing_below` settings on the neighboring content blocks.

## Current migration mapping

Sanity content is normalized to Shopify using the same behavior as the current Astro `preparePageContent()` logic:

1. consecutive Sanity `block` nodes are merged into a single `Rich text` block
2. `pagePortableTextBlock` becomes `Rich text`
3. `pageFullImageGroupBlock` becomes `Full image group`
4. `pageHalfImageGroupBlock` becomes `Half image group`
5. `pageSpacerBlock` is removed and translated into neighboring `spacing_above` / `spacing_below`
6. each Sanity section becomes one top-level `Content section`
7. contact bio text becomes `Contact.contact_body`
8. contact bio image becomes `Contact.contact_image`
9. contact form title becomes `Contact.form_heading`
10. form submission moves to Shopify native contact handling

## Shopify editor outcome

After migration and theme push, the homepage editor should show:

1. top-level `Content section` sections that can be added, removed, and reordered
2. all homepage blocks editable directly in the same theme editor
3. one separate top-level `Contact` section
4. no homepage metaobject dependency for storefront rendering

## Repo commands

Run from `/Users/alex/dev/kites`:

1. `pnpm shopify:theme:check`
2. `pnpm shopify:theme:dev`
3. `pnpm shopify:theme:push`
4. `pnpm shopify:migrate-content`
5. `pnpm shopify:migrate`

## Required environment

Create `/Users/alex/dev/kites/.env` from `/Users/alex/dev/kites/.env.example` and provide:

- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`
- `SANITY_API_VERSION`
- `SHOPIFY_STORE_DOMAIN`
- `SHOPIFY_ADMIN_ACCESS_TOKEN`
- `SHOPIFY_API_VERSION`

## Acceptance checklist

### Content parity

- 4 sections are present in Shopify: `ABOUT`, `SCENT`, `PROCESS`, `STUDIO`
- the raw migrated source still accounts for the current 74 section content items plus contact content
- adjacent text blocks still render as merged rich-text groups
- half-width image groups preserve caption title/body and image counts up to 4

### Front-end parity

- homepage remains a single scrolling composition
- left-nav jump behavior works
- logo/background/layout behave like the Astro reference
- mobile, tablet, and desktop layouts are visually acceptable against the current screenshot baseline

### Shopify-native behavior

- contact form uses `{% form 'contact' %}`
- CAPTCHA is gone
- canonical/title/description/social image come from Shopify-native settings
- images are delivered from Shopify URLs

## Remaining launch work

- confirm target store and authenticated Shopify CLI session
- run the Sanity-to-Shopify migration against the target shop
- set theme settings and native Shopify preferences
- validate the Shopify preview against the existing Playwright screenshot flow
- switch production traffic away from Sanity/Astro after QA signoff
