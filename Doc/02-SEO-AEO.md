# SEO And AEO TODOs

## Current Repo Signals

- `<head>` in `/Users/alex/dev/kites/web/src/pages/index.astro` currently has only charset, viewport, and title.
- No meta description, Open Graph tags, Twitter tags, canonical URL, robots directives, or JSON-LD.
- No `robots.txt` or `sitemap.xml` exists under `/Users/alex/dev/kites/web/public`.
- Most meaningful page content is rendered inside a client-only React island, limiting crawler-readable semantic HTML.
- Sanity schema has no site-level SEO/settings singleton yet (`/Users/alex/dev/kites/studio/schemaTypes/siteContent.ts` only models content sections).

## P0 TODOs (High Impact)

- [x] Add a Sanity `siteSettings` singleton with SEO essentials:
- Site name, default title template, default description, canonical domain, default OG image, social handles.
- [x] Add per-page SEO object fields (even for single-page site) with title, description, noindex, OG overrides, canonical override.
- [x] Render full SEO head tags from Sanity data in Astro:
- `<title>`, `<meta name="description">`, OG tags, Twitter tags, canonical link.
- [x] Ensure content is server-rendered in HTML so crawlers can index copy without waiting for JS hydration.
- [x] Add `robots.txt` and include sitemap location.
- [x] Generate sitemap files from real published content via Astro sitemap integration and exclude `noindex` entries.
- [x] Set `site` in Astro config so canonical/sitemap generation has a stable production origin.

## P1 TODOs

- [ ] Add structured data (JSON-LD) relevant to this site:
- `Organization`, `WebSite`, and content-specific schemas (for portfolio/artwork entities as appropriate).
- [ ] Add `dateModified` and freshness signals if content model tracks updates.
- [x] Move image alt text into Sanity and render meaningful, content-specific alt text (not generic placeholders).
- All Sanity content images now support optional `alt` text fields in Studio.
- Frontend now renders `alt` from Sanity on every content `<img>` and falls back to `alt=""` when no alt text is set.
- [x] Add canonical host redirect policy (www/non-www normalization) via deployment rules.
- [x] Support staging noindex policy to avoid indexing preview environments.

### Accessibility And Semantics (SEO Impact)

- [ ] Convert clickable nav `div`s to semantic `button`/`a` elements with keyboard support.
- [ ] Ensure visible focus states for all interactive elements.
- [ ] Replace spacing via repeated `<br>` with semantic structure and CSS.
- [ ] Audit heading hierarchy and landmark usage (`main`, `nav`, etc.).
- [ ] Improve alt text quality through CMS fields and editorial guidance.
- [ ] Add `prefers-reduced-motion` handling for heavy animation.
- [ ] Validate color contrast and text scaling behavior on mobile.

## P2 TODOs

- [ ] Add richer AEO content blocks where appropriate (FAQ/Q&A, direct-answer snippets).
- [ ] Add EEAT-support fields in CMS:
- Author/artist profile, credentials/context, contact, source links when claims are made.
- [ ] Add internal link architecture (if adding multiple pages) to improve crawl paths and entity relationships.
- [ ] Add `hreflang` strategy if localization is introduced later.

## Validation Checklist

- [ ] Run Rich Results Test for JSON-LD.
- [ ] Run Schema.org validator for structured data integrity.
- [ ] Verify meta tags in rendered static HTML, not only after hydration.
- [ ] Verify indexability and canonical behavior in Search Console after go-live.
