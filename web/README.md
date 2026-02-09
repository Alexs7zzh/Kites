# Web App (Astro)

## Netlify Build Cache

For Netlify builds of this app (`pnpm -C web build`), the persistent build cache lives in the build image cache root:

- `$NETLIFY_BUILD_BASE/cache`
- Current Netlify build images use `/opt/buildhome/cache`
- Some older references use `/opt/build/cache`

This cache is reused across deploys to speed up installs/builds. It is scoped by deploy context (production branch vs each branch/deploy preview).

Use Netlify "Retry without cache" if you need a clean build.
