import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Page, Site } from '../types';
import { googleFontsUrl } from '../lib/fonts';
import { collectFonts } from '../lib/theme';
import { createZip, type ZipEntry } from '../lib/zip';
import { BASE_CSS, mobileMenuCss } from './baseCss';
import { SiteRenderer } from './SiteRenderer';

export function pageFileName(site: Site, page: Page): string {
  return page.id === site.homePageId ? 'index.html' : `${page.slug}.html`;
}

const ZOOM_SCRIPT = `(function(){function f(){var w=document.documentElement.clientWidth,z=w<768?w/360:w<980?w/980:1;document.documentElement.style.setProperty('--wb-zoom',z)}f();addEventListener('resize',f);document.addEventListener('click',function(e){var b=e.target.closest('.wb-burger');if(b){b.parentNode.classList.toggle('wb-open');return}document.querySelectorAll('.wb-menu.wb-open').forEach(function(m){if(!m.contains(e.target)||e.target.closest('a'))m.classList.remove('wb-open')})})})();`;

const EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'video/mp4': 'mp4',
  'video/webm': 'webm',
};

/** Move imagens embutidas (data URLs) para arquivos em assets/. */
async function extractAssets(site: Site): Promise<{ site: Site; files: ZipEntry[] }> {
  const files: ZipEntry[] = [];
  const seen = new Map<string, string>();
  let n = 0;

  const replace = async (value: string): Promise<string> => {
    const known = seen.get(value);
    if (known) return known;
    const mime = value.slice(5, value.search(/[;,]/));
    const ext = EXT[mime];
    if (!ext) return value;
    const data = new Uint8Array(await (await fetch(value)).arrayBuffer());
    const path = `assets/media-${++n}.${ext}`;
    files.push({ path, data });
    seen.set(value, path);
    return path;
  };

  const walk = async (node: unknown): Promise<unknown> => {
    if (typeof node === 'string') return node.startsWith('data:') ? replace(node) : node;
    if (Array.isArray(node)) return Promise.all(node.map(walk));
    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) out[k] = await walk(v);
      return out;
    }
    return node;
  };

  return { site: (await walk(site)) as Site, files };
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export function renderPageHtml(site: Site, page: Page): string {
  const body = renderToStaticMarkup(
    createElement(SiteRenderer, {
      site,
      page,
      target: 'responsive',
      env: {
        site,
        pageId: page.id,
        mode: 'export',
        hrefForPage: (id) => {
          const p = site.pages.find((x) => x.id === id);
          return p ? pageFileName(site, p) : '#';
        },
      },
    }),
  );
  const fonts = googleFontsUrl(collectFonts(site));
  const title = page.seo.title || (page.id === site.homePageId ? site.name : `${page.name} | ${site.name}`);
  return `<!doctype html>
<html lang="${escapeHtml(site.settings.language || 'pt-BR')}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${page.seo.description ? `<meta name="description" content="${escapeHtml(page.seo.description)}">\n` : ''}${
    site.settings.favicon ? `<link rel="icon" href="${escapeHtml(site.settings.favicon)}">\n` : ''
  }${fonts ? `<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link rel="stylesheet" href="${fonts}">\n` : ''}<link rel="stylesheet" href="assets/site.css">
</head>
<body>
${body}
<script>${ZOOM_SCRIPT}</script>
</body>
</html>
`;
}

export const EXPORT_CSS = `html,body{margin:0;padding:0}\n.wb-section{zoom:var(--wb-zoom,1)}\n${BASE_CSS}\n@media (max-width:767px){${mobileMenuCss('.wb-site')}}`;

export async function exportSiteFiles(original: Site): Promise<ZipEntry[]> {
  const { site, files } = await extractAssets(original);
  const pages = site.pages.map((page) => ({ path: pageFileName(site, page), data: renderPageHtml(site, page) }));
  return [...pages, { path: 'assets/site.css', data: EXPORT_CSS }, ...files];
}

export async function exportSiteZip(site: Site): Promise<Blob> {
  return createZip(await exportSiteFiles(site));
}
