# Deployment, Netlify, CDN, And Webhook TODOs

## Current Repo Signals

- Netlify monorepo config now exists at `/Users/alex/dev/kites/netlify.toml` with root base/build and `web/dist` publish output.
- Netlify cache and redirect policy files now exist at `/Users/alex/dev/kites/web/public/_headers` and `/Users/alex/dev/kites/web/public/_redirects`.
- No webhook implementation found for Sanity publish events triggering frontend rebuild.
- Web build fails without required env vars (`PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`) if not configured in deploy environment.
- Sanity web API contract is now pinned in code as `2026-02-09` with `useCdn=false` (not Netlify env-driven).
- Frontend build emits `robots.txt` and Astro sitemap files (`sitemap-index.xml`, `sitemap-0.xml`) in `/Users/alex/dev/kites/web/dist` when required env vars are set.
- Old project had a minimal Netlify config at `/Users/alex/dev/kite/netlify.toml`; new repo now has a dedicated monorepo Netlify config.

## P0 TODOs (High Impact)

- [x] Add Netlify config for monorepo deployment:
- Base dir: repo root.
- Build command: `pnpm -C web build`.
- Publish dir: `web/dist`.
- [x] Define required Netlify environment variables for production:
- `PUBLIC_SANITY_PROJECT_ID`
- `PUBLIC_SANITY_DATASET`
- `PUBLIC_TURNSTILE_SITE_KEY` (if captcha enabled)
- [x] Add cache headers in `_headers`:
- Long cache for hashed JS/CSS and immutable assets.
- Long cache for static fonts/images where safe.
- Short/no-cache for HTML documents.
- [x] Add redirect/canonical host rules in `_redirects` or `netlify.toml`.
- [x] Add `robots.txt` and sitemap hosting in production output.

## P1 TODOs

- [x] Create Netlify build hook for frontend site.
- [ ] Configure Sanity webhook to trigger that hook on publish/unpublish for relevant document types (`siteContent`, `siteSettings`, and future page docs).
- [ ] Use a secret/signed webhook strategy:
- Either Netlify build hook token management.
- Or a custom Netlify Function endpoint that validates signature then triggers build.
- [ ] Add environment separation:
- Production dataset for main branch.
- Preview/staging dataset or preview mode for branch deploys.
- [ ] Pin Node and pnpm versions for deterministic builds.
- [ ] Add deploy preview checks (build + lint + optional Lighthouse budget).

## P2 TODOs

- [ ] Add fallback periodic rebuild (daily/weekly) to self-heal missed webhook events.
- [ ] Add post-deploy smoke tests (home route returns 200, sitemap exists, robots exists).
- [ ] Add rollback runbook:
- Re-deploy previous successful build.
- Revert content if needed.
- [ ] Add uptime monitoring and alerting for the production domain.

## CDN And Asset Strategy TODOs

- [ ] Decide canonical image strategy:
- Sanity CDN transformed URLs for content images.
- Netlify CDN for static local assets.
- [ ] Ensure immutable cache headers align with hashed filenames.
- [ ] Ensure non-hashed local assets either become hashed or get conservative cache TTLs.
- [ ] Confirm background/image compression and edge caching effectiveness in production.

## Verification Checklist

- [ ] Trigger Sanity publish and verify Netlify auto-rebuild starts.
- [ ] Verify production deploy includes expected headers and redirects.
- [ ] Verify cache behavior using response headers on HTML vs static assets.
- [ ] Verify no manual deploy is needed for regular content updates.
