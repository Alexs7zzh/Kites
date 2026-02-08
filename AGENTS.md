## Sanity Studio Deploy Policy

### Scope
These rules apply to this repository (`/Users/alex/dev/kites`) for any change that affects the Sanity Studio app (`/Users/alex/dev/kites/studio`).

### Important Behavior
- Sanity Studio hosted deploys are **not automatic** from this repo today.
- Content publishes in Sanity do not require Studio redeploy.
- Studio code changes (schema/structure/config/dependencies) require a manual Studio redeploy to take effect in the hosted Studio.

### When Redeploy Is Required
Redeploy Studio whenever any of these change:
- `/Users/alex/dev/kites/studio/schemaTypes/**`
- `/Users/alex/dev/kites/studio/structure.ts`
- `/Users/alex/dev/kites/studio/sanity.config.ts`
- `/Users/alex/dev/kites/studio/sanity.cli.ts`
- `/Users/alex/dev/kites/studio/package.json`
- `/Users/alex/dev/kites/studio/pnpm-lock.yaml`
- `/Users/alex/dev/kites/pnpm-lock.yaml` (if Studio dependencies changed)

### Manual Deploy Steps (CLI)
Run from repo root:
1. `pnpm -C /Users/alex/dev/kites/studio build`
2. `pnpm -C /Users/alex/dev/kites/studio run deploy`

### PR / Commit Checklist For Agents
For PRs that include Studio config/schema changes:
- Confirm Studio build passes.
- Include in summary: "Studio redeploy required: yes".
- Include exact deploy commands in summary.

For PRs without Studio config/schema changes:
- Include in summary: "Studio redeploy required: no".

### Optional Future Automation
If GitHub Actions is added later, trigger Studio deploy workflow on changes under `/studio/**` and require secrets for Sanity auth.
