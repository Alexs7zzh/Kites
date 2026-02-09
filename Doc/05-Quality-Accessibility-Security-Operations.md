# Quality, Accessibility, Security, And Operations TODOs

## Current Repo Signals

- Web app depends on `latest` versions for several core packages in `/Users/alex/dev/kites/web/package.json`.
- Content rendering uses `dangerouslySetInnerHTML` in `/Users/alex/dev/kites/web/src/components/Content.jsx`.
- Navigation items are clickable `div`s in `/Users/alex/dev/kites/web/src/components/MagneticDangoLine.jsx` (not semantic buttons/links).
- No automated test suite or CI quality gate is configured in this repo.
- No explicit security headers or CSP setup exists in deploy config (currently absent).

## Code Quality TODOs

- [x] Pin dependency versions instead of `latest` for reproducible builds.
- [ ] Add linting/formatting consistency across `web` and `studio`.
- [ ] Add shared scripts for type-check/lint/build in CI.
- [ ] Add smoke tests for critical rendering and metadata behavior.
- [ ] Add regression checks for Sanity query/schema changes.

## Accessibility TODOs

- [ ] Convert clickable nav `div`s to semantic `button`/`a` elements with keyboard support.
- [ ] Ensure visible focus states for all interactive elements.
- [ ] Replace spacing via repeated `<br>` with semantic structure and CSS.
- [ ] Audit heading hierarchy and landmark usage (`main`, `nav`, etc.).
- [ ] Improve alt text quality through CMS fields and editorial guidance.
- [ ] Add `prefers-reduced-motion` handling for heavy animation.
- [ ] Validate color contrast and text scaling behavior on mobile.

## Security TODOs

- [ ] Remove or tightly control `dangerouslySetInnerHTML` usage:
- Prefer safe text rendering or sanitize HTML before injection.
- [ ] Add security response headers:
- Content-Security-Policy
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Strict-Transport-Security`
- [ ] Restrict allowed third-party script/connect domains (Sanity CDN, Turnstile, form endpoint) in CSP.
- [ ] Validate/allowlist contact form target domains to prevent accidental malicious endpoint changes.
- [ ] Add abuse controls for contact form (captcha only when needed, optional honeypot/rate limiting).

## Observability And Operations TODOs

- [ ] Add frontend error monitoring (e.g., Sentry or equivalent).
- [ ] Add web-vitals reporting and dashboard tracking.
- [ ] Add build/deploy event logging for webhook-triggered rebuilds.
- [ ] Add production health checks and alerting.
- [ ] Add runbooks:
- Content publish failure.
- Webhook failure.
- Build failure.
- Rollback process.

## Data Integrity TODOs

- [ ] Fail safe on critical missing content (or add explicit fallback policy) instead of silent degradation.
- [ ] Add runtime validation for fetched Sanity payload to catch schema drift.
- [ ] Add script/check to detect missing image assets or broken references before deploy.
- [ ] Add editorial checklist for required metadata and accessibility fields before publish.

## Verification Checklist

- [ ] Run automated accessibility scan (Axe/Lighthouse) on production preview.
- [ ] Confirm keyboard-only navigation works end-to-end.
- [ ] Confirm CSP does not block required app functionality.
- [ ] Confirm monitoring captures both JS runtime errors and failed content fetches.

