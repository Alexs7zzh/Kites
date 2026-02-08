# Kites Migration And Optimization Backlog

This folder captures TODOs discovered from auditing:

- `/Users/alex/dev/kites/web`
- `/Users/alex/dev/kites/studio`
- legacy reference project: `/Users/alex/dev/kite`

Use this as a master backlog and prune items you do not need.

## Topic Docs

1. `01-Performance.md`
2. `02-SEO-AEO.md`
3. `03-Sanity-CMS-Migration.md`
4. `04-Deployment-Netlify-CDN-Webhooks.md`
5. `05-Quality-Accessibility-Security-Operations.md`

## Suggested Execution Order

1. Finalize CMS/content model decisions (`03`) so metadata and image fields exist.
2. Implement SEO + render model changes (`02`) so content is crawlable.
3. Implement performance work (`01`) once rendering and content fields are stable.
4. Wire Netlify + webhooks + caching (`04`) for production flow.
5. Close QA, accessibility, security, and observability gaps (`05`).

