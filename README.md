# Iris

Static Cloudflare Pages site for `www.2030-oo.net`.

## Public Surface Rules

- Only root-level HTML files listed in `tools/public-pages.json` are public pages.
- `sitemap.xml`, `_redirects`, `robots.txt`, `list.txt`, and `tools/generated/public-navigation.*` are generated from `tools/public-pages.json`.
- Removed or private pages must not remain in the repository, build output, sitemap, redirects, public navigation, or asset directories.
- `_private/` is not a privacy mechanism. Do not store non-public HTML or assets in this repository unless the deployment pipeline excludes them.
- Run `npm run build` before pushing changes that add, remove, or rename pages.

## Deployment

The `main` branch deploys through Cloudflare Pages. Use `npm run build` as the Cloudflare Pages build command so generation and public-surface validation run before deploy.

## Maintenance

Generated Google Sites HTML is large and duplicated. Prefer editing public navigation and page inventory through scripted checks rather than ad hoc manual edits.
