# Performance TODOs

## Current Repo Signals

- Main page content is delivered through `client:only="react"` in `/Users/alex/dev/kites/web/src/pages/index.astro`, so almost the entire experience waits on React hydration.
- Sanity images are queried as raw `asset->url` and rendered as plain `<img>` tags in `/Users/alex/dev/kites/web/src/components/Content.jsx` with no responsive sizing pipeline.
- Many images do not use `loading`, `decoding`, or explicit dimensions in `/Users/alex/dev/kites/web/src/components/Content.jsx`.
- Very large background asset (`/Users/alex/dev/kites/web/public/2025-08-05-Background.png`, ~4.6 MB) is loaded on first paint.
- Fonts are duplicated in both `/Users/alex/dev/kites/web/public/fonts` and `/Users/alex/dev/kites/web/src/components/fonts`, and CSS defines `@font-face` multiple times.
- `MagneticDangoLine` blocks initial reveal on asset/font preloading (`document.fonts.load(...)`) in `/Users/alex/dev/kites/web/src/components/MagneticDangoLine.jsx`.
- Turnstile script is injected on page load when key is set, not on user intent (`/Users/alex/dev/kites/web/src/components/Content.jsx`).

## P0 TODOs (High Impact)

- [ ] Replace full-page `client:only` rendering with server-rendered HTML for content and hydrate only truly interactive parts.
- [ ] Keep Astro static build output, but split heavy animation/navigation into a smaller island instead of hydrating the entire content tree.
- [ ] Move all Sanity images to an optimization pipeline:
- Use Astro `Image` where possible, or use Sanity URL params (`w`, `h`, `fit`, `auto=format`) consistently.
- [ ] Query image metadata (`dimensions`, `lqip`) and render explicit width/height to reduce CLS.
- [ ] Add `loading="lazy"` and `decoding="async"` for below-the-fold images; set `fetchpriority="high"` only for the most important above-the-fold image(s).
- [ ] Convert oversized PNG hero/background assets to modern formats (WebP/AVIF variants) and serve responsive versions by viewport.
- [ ] Remove duplicate font sources and ship only one canonical set (prefer WOFF2 first, WOFF fallback only if needed).
- [ ] Add `font-display: swap` and preload only the minimum critical font file(s).

## P1 TODOs

- [ ] Avoid waiting on full asset preload before showing UI; reveal content quickly and let non-critical assets stream.
- [ ] Add `preconnect` for external hosts used at startup (`https://cdn.sanity.io`, optionally Turnstile host when captcha is expected).
- [ ] Defer Turnstile script loading until form interaction (submit attempt/focus), not initial load.
- [ ] Review `framer-motion` footprint and replace portions with lightweight native animation where feasible.
- [ ] Add a performance budget for total JS, image bytes, and LCP asset size.
- [ ] Move repeated inline styles to CSS classes to reduce markup size and improve caching/diffing.
- [ ] Ensure favicon assets are optimized (`/Users/alex/dev/kites/web/public/favicon.ico` is large).

## P2 TODOs

- [ ] Add `content-visibility: auto` and containment strategies for long off-screen sections where safe.
- [ ] Add optional prefetch/prerender hints only for truly critical next navigations (if multipage routes are introduced).
- [ ] Evaluate a static decorative background alternative for low-end devices (`prefers-reduced-motion`, low-power mode).
- [ ] Add an automated Lighthouse run (CI) to prevent regressions.

## Validation Checklist

- [ ] Measure Core Web Vitals before/after (LCP, INP, CLS) on mobile and desktop.
- [ ] Confirm first contentful HTML is visible with JavaScript disabled.
- [ ] Confirm no image ships at original resolution when displayed much smaller.
- [ ] Confirm font loading no longer causes FOIT.

