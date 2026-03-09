# Shopify Migration Plan (Typed Blocks + Global Contact Form)

## Current status
- Shopify theme/template edits are paused due to visual regression risk.
- We can proceed now with data-model setup, migration preparation, and operational readiness.

## Final architecture decisions
1. Use **typed block metaobjects** (not a polymorphic `content_block`).
2. Use a single singleton metaobject named **`site_settings`** as the central page config.
3. Contact form is **not** a block:
- Always rendered at the end of the page.
- Uses Shopify native contact form fields (`name`, `email`, `message`).
- Title/body are configured from `site_settings`.
4. Keep metadata strategy hybrid:
- Native Shopify for baseline SEO/canonical settings.
- `site_settings` for site-specific social handles and contact-form presentation content.
5. Keep content hierarchy flat:
- `site_settings.sections[]` -> `page_section`
- `page_section.blocks[]` -> typed block references
- No nested block children in phase 1.

## Shopify data model (final)

## 1) `site_settings` (singleton, handle `default`)
Definition name: `Site settings`  
Type: `site_settings`

Fields:
1. `background_image` -> File
2. `sections` -> List of metaobject references -> references `page_section`
3. `contact_form_title` -> Single line text (default: `Request & Purchase`)
4. `contact_form_body` -> Rich text (optional)
5. `x_handle` -> Single line text (no `@`)
6. `instagram_handle` -> Single line text (no `@`)

Notes:
- This is the central object for the whole one-page site.
- It replaces the previous idea of a separate `homepage` + `site_settings` split.

## 2) `page_section`
Definition name: `Page section`  
Type: `page_section`

Fields:
1. `nav_label` -> Single line text
2. `title` -> Single line text (optional)
3. `section_key` -> Single line text
4. `blocks` -> List of mixed metaobject references -> references:
- `rich_text_block`
- `image_block`
- `image_pair_block`

## 3) `rich_text_block`
Definition name: `Rich text block`  
Type: `rich_text_block`

Fields:
1. `body` -> Rich text

## 4) `image_block`
Definition name: `Image block`  
Type: `image_block`

Fields:
1. `image` -> File
2. `alt_text` -> Single line text (optional; recommended for accessibility)
3. `layout` -> Single line text (`full` or `half`)
4. `align` -> Single line text (`left`, `center`, `right`)
5. `caption` -> Single line text (optional)
6. `image_height_px` -> Integer (optional)

## 5) `image_pair_block`
Definition name: `Image pair block`  
Type: `image_pair_block`

Fields:
1. `left_image` -> File
2. `right_image` -> File
3. `left_alt_text` -> Single line text (optional; recommended for accessibility)
4. `right_alt_text` -> Single line text (optional; recommended for accessibility)
5. `ratio` -> Single line text (`50-50`, `60-40`, `40-60`)
6. `left_caption` -> Single line text (optional)
7. `right_caption` -> Single line text (optional)
8. `image_height_px` -> Integer (optional)

## Why this model
1. Better editor UX than polymorphic blocks (only relevant fields appear per block type).
2. Better validation and lower chance of invalid content combinations.
3. Cleaner migration and lower long-term maintenance cost.
4. Contact form behavior stays consistent and reusable across future page changes.

## Shopify Admin setup guide

## A) Create metaobject definitions
In Shopify Admin:
1. `Settings` -> `Custom data` -> `Metaobjects`.
2. Create definitions in this order:
- `rich_text_block`
- `image_block`
- `image_pair_block`
- `page_section`
- `site_settings`
3. Ensure storefront/API access is enabled for these definitions.

## B) Create entries
1. Create block entries (`rich_text_block`, `image_block`, `image_pair_block`).
2. Create `page_section` entries and assign ordered `blocks`.
3. Create one `site_settings` entry with handle `default`.
4. Set `site_settings.sections` in final page order.

## C) Add validations now
1. `site_settings`:
- `sections` required, min 1.
- `contact_form_title` required.
- Social handles must not include `@`.
2. `page_section`:
- `nav_label` required.
- `blocks` required, min 1.
3. `rich_text_block`:
- `body` required.
4. `image_block`:
- `image` required.
- `alt_text` optional but recommended.
- `layout` required.
- `align` required.
- `caption` optional.
- `image_height_px` optional, min 120, max 2400.
5. `image_pair_block`:
- `left_image` and `right_image` required.
- `left_alt_text` and `right_alt_text` optional but recommended.
- `ratio` required.
- `left_caption` and `right_caption` optional.
- `image_height_px` optional, min 120, max 2400.

## D) Native Shopify metadata setup (do this too)
Use native settings for baseline metadata:
1. `Settings -> General`:
- Store name.
2. `Online Store -> Preferences`:
- Homepage title.
- Homepage meta description.
- Social sharing image.
3. `Settings -> Domains`:
- Primary domain and redirect policy.

## Rendering contract for later theme work (documented now)
When theme work resumes:
1. Read `site_settings/default`.
2. Render background from `background_image`.
3. Loop `sections[]` then each section `blocks[]`:
- `rich_text_block` -> text rendering.
- `image_block` -> single image rendering with optional alt text, optional caption, and optional height override.
- `image_pair_block` -> pair rendering with ratio, optional per-image alt text/captions, and optional height override.
4. After all sections, always render one native Shopify contact form:
- `{% form 'contact' %}` with fields `name`, `email`, `message`.
- Heading/body from `site_settings.contact_form_title` and `site_settings.contact_form_body`.

## Image handling decision (locked)
1. Replace Astro transforms with Shopify image delivery.
2. Upload original assets; use Shopify CDN optimization.
3. Do not preserve Sanity hotspot/crop rules in phase 1.
4. If framing needs adjustment, handle later via CSS/object-position and optional `image_height_px`.

## What we can do now (no theme edits)

## 1) Content/data prep
1. Create all 5 metaobject definitions.
2. Create `site_settings/default` and initial section references.
3. Export final Sanity snapshot for migration mapping and rollback archive.
4. Upload core assets (logo/background/priority images) to Shopify Files.

## 2) Engineering prep in this repo
1. Add migration scripts under `scripts/shopify/`:
- `sync-metaobject-definitions`
- `migrate-sanity-to-shopify`
2. Add `.env` template for Shopify Admin API credentials.
3. Freeze current visual baseline from `/web/tests/visual`.
4. Create launch smoke-test checklist.

## 3) Operational prep
1. Create private app + Admin API token with minimum scopes.
2. Decide content freeze and launch window.
3. Assign final QA owner for pre-launch signoff.

## Sanity -> Shopify mapping rules (phase 2)
1. Sanity portable text blocks -> `rich_text_block`.
2. Sanity `pageImageBlock` -> `image_block` (`alt` -> `alt_text`, `caption` preserved if present).
3. Sanity `pageImagePairBlock` -> `image_pair_block` (`left/right alt` -> `left_alt_text` / `right_alt_text`, `left/right caption` preserved if present).
4. Sanity `contactFormBlock`:
- Do not migrate as section block.
- Migrate heading/body into `site_settings.contact_form_title` and `site_settings.contact_form_body` (first canonical block wins).
5. Sanity section ordering -> `site_settings.sections[]`.

## Phased execution plan

## Phase 0: Baseline and freeze
1. Preserve visual baseline and current production behavior references.
2. Snapshot Sanity content and asset inventory.

## Phase 1: Data model setup
1. Configure the 5 metaobject definitions and validations.
2. Create singleton `site_settings/default`.
3. Configure native Shopify metadata settings.

## Phase 2: Migration pipeline
1. Implement idempotent sync scripts for definitions and content.
2. Migrate content and files from Sanity.
3. Produce migration report and rerun for idempotency check.

## Phase 3: Theme rendering (paused)
1. Implement section/block renderer against typed model.
2. Append reusable global contact form at page end.
3. Reproduce current interaction behavior.

## Phase 4: QA and parity
1. Visual comparison against baseline.
2. Validate nav order, block rendering, image behavior, contact flow, metadata.

## Phase 5: Launch
1. Final migration sync.
2. Publish theme and perform single-switch DNS cutover.
3. Run production smoke tests.

## Phase 6: Decommission old stack
1. Archive migration artifacts.
2. Retire Sanity from active operations.
3. Retire old web hosting production path.

## Definition of done
1. Typed block model is live and editable in Shopify.
2. Contact form is globally rendered at page end and works in production.
3. Visual parity is accepted against baseline thresholds.
4. SEO metadata is configured and validated.
5. Rollback/migration artifacts are archived.
