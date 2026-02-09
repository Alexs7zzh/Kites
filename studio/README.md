# Kites Sanity Studio

This Studio manages the `siteContent` singleton for the Kites site.

## Prerequisites

- Logged in to Sanity CLI: `sanity login`
- Write access to project `wmjirbvx`, dataset `production`

## Commands

- Start Studio: `pnpm dev`
- Build Studio: `pnpm build`
- Deploy hosted Studio: `pnpm run deploy`

## Hosted Deploy Notes

- Deploy command: `pnpm -C /Users/alex/dev/kites/studio run deploy`
- Prefer hostname `kites` when available.
- If `kites` is unavailable, use `kites-studio`, otherwise accept a unique CLI suggestion.
- Hosted URL format: `https://<hostname>.sanity.studio`
