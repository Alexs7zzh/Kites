# Shopify Migration Plan Refresh

## What now exists in this repo

- `/Users/alex/dev/kites/web` remains the read-only reference implementation.
- `/Users/alex/dev/kites/shopify` now contains the new custom Shopify theme scaffold.
- `/Users/alex/dev/kites/scripts/shopify` now contains the migration automation for:
  - syncing Shopify metaobject definitions
  - migrating current Sanity content into Shopify metaobjects
  - uploading referenced Sanity images into Shopify Files
- `/Users/alex/dev/kites/.env.example` documents the environment variables needed for the migration scripts.

## Target architecture

Production should end on Shopify only:

1. Theme runtime:
   - custom Shopify theme in `/Users/alex/dev/kites/shopify`
   - homepage rendered from `shop.metaobjects.homepage_content.default`
   - left-nav + one-page scroll behavior preserved
   - native Shopify contact form used instead of the current custom POST + Turnstile flow
2. Content model:
   - native Shopify settings for domain/title/meta description/social sharing image
   - theme settings for global visuals and optional social handles
   - metaobjects only for structured editorial content
3. Decommission target:
   - Sanity Studio removed from the live operational path
   - Astro site removed from the live operational path

## Implemented Shopify content model

### Metaobject definitions

The implemented automation now targets these three definitions:

1. `content_block`
   - `block_type` (`single_line_text_field`, required)
   - `body` (`rich_text_field`)
   - `level` (`number_integer`, min 1, max 6)
   - `layout` (`single_line_text_field`)
   - `images` (`list.file_reference`)
   - `caption_title` (`single_line_text_field`)
   - `caption_body` (`multi_line_text_field`)
2. `page_section`
   - `nav_label` (`single_line_text_field`, required)
   - `admin_title` (`single_line_text_field`)
   - `blocks` (`list.metaobject_reference`, required, constrained to `content_block`)
3. `homepage_content`
   - `sections` (`list.metaobject_reference`, required, constrained to `page_section`)
   - `contact_body` (`rich_text_field`)
   - `contact_image` (`file_reference`)
   - `contact_form_heading` (`single_line_text_field`, required)

The original typed-block plan had to be collapsed into a single `content_block` definition because Shopify's merchant-owned metaobject API would not allow the `page_section.blocks` field to be created as an automatable mixed reference list.

### Theme settings

The theme currently exposes:

- `logo_image`
- `background_image`
- `background_placeholder_color`
- `social_x_handle`
- `social_instagram_handle`

## Current migration mapping

Sanity content is normalized to Shopify using the same behavior as the current Astro `preparePageContent()` logic:

1. consecutive Sanity `block` nodes are merged into a single `content_block` with `block_type = rich_text`
2. `pagePortableTextBlock` becomes `content_block` with `block_type = rich_text`
3. `pageSpacerBlock` becomes `content_block` with `block_type = spacer`
4. `pageFullImageGroupBlock` becomes `content_block` with `block_type = image_group` and `layout = full`
5. `pageHalfImageGroupBlock` becomes `content_block` with `block_type = image_group` and `layout = half`
6. `section.title` is preserved as `admin_title` only
7. contact bio text becomes `homepage_content.contact_body`
8. contact bio image becomes `homepage_content.contact_image`
9. contact form title becomes `homepage_content.contact_form_heading`
10. form submission moves to Shopify native contact handling

## Manual Shopify Admin fallback

If the API sync is blocked or you want to create the model by hand first:

1. Go to `Settings -> Custom data -> Metaobjects`.
2. Create definitions in this order:
   - `content_block`
   - `page_section`
   - `homepage_content`
3. Enable storefront/theme access for the definitions used by the theme.
4. Create one `homepage_content` entry with handle `default`.
5. Create block entries, then section entries, then assign `homepage_content.sections` in final order.
6. In the theme editor, set:
   - logo image
   - background image
   - optional social handles
7. In Shopify Admin, set native store metadata:
   - `Online Store -> Preferences -> homepage title`
   - `Online Store -> Preferences -> homepage meta description`
   - `Online Store -> Preferences -> social sharing image`
   - `Settings -> Domains -> primary domain`

## Repo commands

Run from `/Users/alex/dev/kites`:

1. `pnpm shopify:theme:check`
2. `pnpm shopify:theme:dev`
3. `pnpm shopify:theme:push`
4. `pnpm shopify:sync-definitions`
5. `pnpm shopify:migrate-content`
6. `pnpm shopify:migrate`

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
- run the definition sync against the target shop
- run the Sanity-to-Shopify migration against the target shop
- set theme settings and native Shopify preferences
- validate the Shopify preview against the existing Playwright screenshot flow
- switch production traffic away from Sanity/Astro after QA signoff
