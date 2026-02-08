# Sanity CMS Migration TODOs

## Current Repo Signals

- Studio currently models only one singleton document: `siteContent` in `/Users/alex/dev/kites/studio/schemaTypes/siteContent.ts`.
- Structure singleton wiring exists (`/Users/alex/dev/kites/studio/structure.ts`) but no global settings singleton.
- Import script exists (`/Users/alex/dev/kites/studio/scripts/import-kite-content.ts`) and maps legacy `/Users/alex/dev/kite/public/content.json` into `siteContent`.
- Import defaults use an absolute local path (`/Users/alex/dev/kite/...`), which is not portable across machines/CI.
- Schema currently uses mostly plain `text` fields and hardcoded image fields without dedicated alt/caption metadata.

## P0 TODOs (High Impact)

- [ ] Decide final content model scope:
- Keep single-page singleton only, or evolve to multi-document pages/projects.
- [ ] Add `siteSettings` singleton schema:
- Brand/site identity, SEO defaults, canonical domain, social links, contact data.
- [ ] Add reusable SEO object schema and attach to page-level content.
- [ ] Add image metadata fields (at minimum `alt`) for every editorial image slot.
- [ ] Add schema validations beyond `required()`:
- SEO title/description length warnings.
- URL validations with clear error messages.
- Field constraints for arrays and key business rules.
- [ ] Replace absolute path defaults in import tooling with repo-relative or CLI-required inputs.
- [ ] Define cutover checklist to freeze CloudCannon edits before final Sanity import.

## P1 TODOs

- [ ] Evaluate moving repeated entities to references:
- Studio projects as document type if they need independent lifecycle/reuse.
- [ ] Add migration strategy for legacy metadata not in current model:
- favicon/social/description defaults from old project.
- [ ] Add redirect model in Sanity if URL structure may change.
- [ ] Add draft/preview workflow if editorial preview is required before publish.
- [ ] Add schema field descriptions for non-technical editors to reduce content mistakes.
- [ ] Add role/permission model for editor vs admin actions.
- [ ] Add content governance:
- Required review fields.
- Last reviewed date.
- Optional owner/editor assignment.

## P2 TODOs

- [ ] Consider Portable Text for richer editorial control where HTML is currently injected.
- [ ] Add taxonomy/tagging model if search/filtering or richer navigation is planned.
- [ ] Add localization plan (document-level or field-level) if multilingual support is expected.
- [ ] Add release/versioning workflow (scheduled publishing or release actions).

## Developer Experience TODOs

- [ ] Add query constants and typed results workflow (TypeGen):
- schema extract + type generation scripts.
- [ ] Introduce runtime validation for fetched content shape before rendering.
- [ ] Add Studio deploy/versioning process docs (environments, promotion strategy).
- [ ] Consider disabling Vision tool in production Studio if not needed by editors.

## Migration Completion Checklist (CloudCannon -> Sanity)

- [ ] Confirm all legacy fields from `/Users/alex/dev/kite/public/content.json` are mapped or intentionally dropped.
- [ ] Confirm all legacy assets were uploaded and linked.
- [ ] Confirm no operational dependency remains on CloudCannon config (`cloudcannon.config.yml`).
- [ ] Archive legacy project with clear read-only status after production cutover.

