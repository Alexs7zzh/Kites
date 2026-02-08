# Kites Sanity Studio

This Studio manages the `siteContent` singleton for the Kites site.

## Prerequisites

- Logged in to Sanity CLI: `sanity login`
- Write access to project `wmjirbvx`, dataset `production`

## Source Of Truth

- Legacy source file: `/Users/alex/dev/kite/public/content.json`

## Commands

- Start Studio: `pnpm dev`
- Build Studio: `pnpm build`
- Deploy hosted Studio: `pnpm run deploy`
- Dry run import: `pnpm import:kite:dry`
- Full import (writes to production): `pnpm import:kite`

## Hosted Deploy Notes

- Deploy command: `pnpm -C /Users/alex/dev/kites/studio run deploy`
- Prefer hostname `kites` when available.
- If `kites` is unavailable, use `kites-studio`, otherwise accept a unique CLI suggestion.
- Hosted URL format: `https://<hostname>.sanity.studio`

Optional import args:

- `--source /path/to/content.json`
- `--public-dir /path/to/public`

Example:

```bash
pnpm import:kite:dry -- --source /Users/alex/dev/kite/public/content.json
```

## Import Behavior

- Imports into fixed singleton document:
  - `_id: siteContent`
  - `_type: siteContent`
- Rerunning import replaces the same document (`createOrReplace`).
- Local image paths from legacy JSON are uploaded as Sanity image assets and stored as references.
