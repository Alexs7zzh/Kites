# Web App (Astro)

## Netlify Build Cache

For Netlify builds of this app (`pnpm -C web build`), the persistent build cache lives in the build image cache root:

- `$NETLIFY_BUILD_BASE/cache`
- Current Netlify build images use `/opt/buildhome/cache`
- Some older references use `/opt/build/cache`

This cache is reused across deploys to speed up installs/builds. It is scoped by deploy context (production branch vs each branch/deploy preview).

Use Netlify "Retry without cache" if you need a clean build.

## Font Asset Update Workflow

When updating the generated Victor Mono subset files, use this repeatable flow:

1. Generate WOFF2 from the current subset WOFF files.
2. Compute MD5 hashes from the final file bytes.
3. Rename font files with an 8-char hash suffix for cache invalidation.
4. Update font paths in `/Users/alex/dev/kites/web/src/components/MagneticDangoLine.css` and preload href in `/Users/alex/dev/kites/web/src/pages/index.astro`.

```bash
FONT_DIR="/Users/alex/dev/kites/web/public/fonts"
python3 -m venv /tmp/kites-font-tools
source /tmp/kites-font-tools/bin/activate
pip install --quiet --disable-pip-version-check fonttools brotli

reg_woff=$(ls "$FONT_DIR"/VictorMono-Regular*.woff | grep -v 'Original' | head -n1)
med_woff=$(ls "$FONT_DIR"/VictorMono-Medium*.woff | grep -v 'Original' | head -n1)

pyftsubset "$reg_woff" --unicodes='*' --flavor=woff2 --output-file="$FONT_DIR/VictorMono-Regular.next.woff2"
pyftsubset "$med_woff" --unicodes='*' --flavor=woff2 --output-file="$FONT_DIR/VictorMono-Medium.next.woff2"

reg_woff_hash=$(md5 -q "$reg_woff" | cut -c1-8)
med_woff_hash=$(md5 -q "$med_woff" | cut -c1-8)
reg_woff2_hash=$(md5 -q "$FONT_DIR/VictorMono-Regular.next.woff2" | cut -c1-8)
med_woff2_hash=$(md5 -q "$FONT_DIR/VictorMono-Medium.next.woff2" | cut -c1-8)

mv "$reg_woff" "$FONT_DIR/VictorMono-Regular.${reg_woff_hash}.woff"
mv "$med_woff" "$FONT_DIR/VictorMono-Medium.${med_woff_hash}.woff"
mv "$FONT_DIR/VictorMono-Regular.next.woff2" "$FONT_DIR/VictorMono-Regular.${reg_woff2_hash}.woff2"
mv "$FONT_DIR/VictorMono-Medium.next.woff2" "$FONT_DIR/VictorMono-Medium.${med_woff2_hash}.woff2"
```
