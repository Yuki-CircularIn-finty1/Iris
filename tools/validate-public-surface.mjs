import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const toolsDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.dirname(toolsDir);
const manifest = JSON.parse(await readFile(path.join(toolsDir, 'public-pages.json'), 'utf8'));
const blockedNames = manifest.privateSlugs;
const failures = [];

function fail(message) {
  failures.push(message);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

for (const name of ['_private', 'dist', ...blockedNames]) {
  if (existsSync(path.join(root, name))) {
    fail(`Unexpected public artifact remains: ${name}`);
  }
}

for (const name of blockedNames) {
  if (existsSync(path.join(root, `${name}.html`))) {
    fail(`Unexpected public HTML remains: ${name}.html`);
  }
}

const rootEntries = await readdir(root, { withFileTypes: true });
const publicHtmlFiles = rootEntries
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html') && entry.name !== '404.html')
  .map((entry) => path.join(root, entry.name));
const manifestHtmlFiles = new Set(manifest.pages.map((page) => page.html));

for (const file of publicHtmlFiles) {
  const fileName = path.basename(file);
  if (!manifestHtmlFiles.has(fileName)) {
    fail(`Root HTML is not declared in tools/public-pages.json: ${fileName}`);
  }
}

const textFiles = [
  '_redirects',
  'list.txt',
  'robots.txt',
  'sitemap.xml',
  'tools/generated/public-navigation.json',
  'tools/generated/public-navigation.inc',
]
  .map((name) => path.join(root, name))
  .filter((file) => existsSync(file));

for (const file of [...textFiles, ...publicHtmlFiles]) {
  const content = await readFile(file, 'utf8');
  for (const name of blockedNames) {
    const escaped = escapeRegExp(name);
    const patterns = [
      new RegExp(`href=["']/?${escaped}(?:\\.html)?(?:["'#?]|/)`, 'i'),
      new RegExp(`<loc>${escapeRegExp(manifest.baseUrl)}/${escaped}(?:\\.html)?/?</loc>`, 'i'),
      new RegExp(`^/${escaped}(?:\\.html)?\\s`, 'im'),
      new RegExp(`${escapeRegExp(manifest.baseUrl)}/${escaped}(?:\\.html)?(?:["'<#?]|$)`, 'i'),
    ];
    for (const pattern of patterns) {
      if (pattern.test(content)) {
        fail(`Blocked public route '${name}' found in ${path.relative(root, file)}`);
      }
    }
  }
}

const sitemap = await readFile(path.join(root, 'sitemap.xml'), 'utf8');
if (!sitemap.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
  fail('sitemap.xml is missing the sitemap urlset root.');
}

for (const page of manifest.pages) {
  const route = page.slug ? `/${page.slug}` : '/';
  const expectedCanonical = `${manifest.baseUrl}${route === '/' ? '/' : route}`;
  const html = await readFile(path.join(root, page.html), 'utf8');
  if (!html.includes(`rel="canonical" href="${expectedCanonical}"`)) {
    fail(`Canonical URL for ${page.html} must be ${expectedCanonical}`);
  }
}

const headers = await readFile(path.join(root, '_headers'), 'utf8');
for (const header of [
  'Content-Security-Policy:',
  'X-Frame-Options:',
  'X-Content-Type-Options:',
  'Referrer-Policy:',
  'Permissions-Policy:',
  'Strict-Transport-Security:',
  'Cross-Origin-Opener-Policy:',
  'X-Permitted-Cross-Domain-Policies:',
]) {
  if (!headers.includes(header)) fail(`Missing required security header in _headers: ${header}`);
}

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log('Public surface validation passed.');
