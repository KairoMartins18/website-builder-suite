// Converte containers e widgets do editor em marcação de blocos do WordPress.
//
// Estratégia: o layout (flex/grade, larguras, ajustes por dispositivo) e o visual ficam
// em classes CSS geradas (n-<id>) no tema; os blocos usam apenas "className". Assim a
// marcação salva é exatamente a que o editor do WordPress gera (sem erros de validação)
// e o conteúdo (textos, imagens, botões, links) continua editável no WordPress.
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { ContainerNode, FlowNode, Link, Section, Site, WidgetNode } from '../types';
import { isFlow } from '../lib/flow';
import { resolveColor } from '../lib/theme';
import { layoutCss, RenderedSection } from '../render/SiteRenderer';
import { ElementContent, videoSource, type RenderEnv } from '../render/ElementContent';

/** Prefixo das imagens extraídas para o tema (ver exportTheme.ts). */
export const ASSET = 'wbs-asset://';

/** Marcadores trocados por PHP nos padrões do tema. */
export const imgToken = (path: string) => `{{wp-img:${path}}}`;
export const pageToken = (slug: string) => `{{wp-page:${slug}}}`;

export const escAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const escText = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Serialização de atributos idêntica à do WordPress (@wordpress/blocks). */
export function serializeAttributes(attrs: Record<string, unknown>): string {
  return JSON.stringify(attrs)
    .replace(/--/g, '\\u002d\\u002d')
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\\"/g, '\\u0022');
}

export function block(name: string, attrs: Record<string, unknown> = {}, inner?: string): string {
  const clean = Object.fromEntries(Object.entries(attrs).filter(([, v]) => v !== undefined));
  const a = Object.keys(clean).length ? ' ' + serializeAttributes(clean) : '';
  const n = name.startsWith('core/') ? name.slice(5) : name;
  return inner === undefined ? `<!-- wp:${n}${a} /-->` : `<!-- wp:${n}${a} -->\n${inner}\n<!-- /wp:${n} -->`;
}

export interface WpContext {
  site: Site;
  /** slug da página por id ('' = página inicial). */
  slugOf: (pageId: string) => string | undefined;
}

const src = (url: string) => (url.startsWith(ASSET) ? imgToken(url.slice(ASSET.length)) : url);

function href(link: Link | undefined, ctx: WpContext): { href: string; newTab?: boolean } | null {
  if (!link) return null;
  switch (link.kind) {
    case 'page': {
      const slug = link.pageId ? ctx.slugOf(link.pageId) : undefined;
      return slug === undefined ? null : { href: pageToken(slug) };
    }
    case 'url':
      return link.url ? { href: link.url, newTab: link.newTab } : null;
    case 'email':
      return link.url ? { href: `mailto:${link.url}` } : null;
    case 'phone':
      return link.url ? { href: `tel:${link.url.replace(/[^\d+]/g, '')}` } : null;
  }
}

const INLINE = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'S', 'A', 'BR', 'SPAN', 'SUB', 'SUP', 'CODE', 'MARK']);

/** Converte o HTML do editor de texto em conteúdo inline aceito por título/parágrafo. */
export function inlineHtml(html: string): string {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const out: string[] = [];
  const walk = (node: Node) => {
    node.childNodes.forEach((child, i) => {
      if (child.nodeType === Node.TEXT_NODE) {
        out.push(escText(child.textContent ?? '').replace(/\n/g, '<br>'));
        return;
      }
      if (!(child instanceof HTMLElement)) return;
      const tag = child.tagName;
      if (tag === 'BR') {
        out.push('<br>');
        return;
      }
      if (!INLINE.has(tag)) {
        // Blocos (div/p vindos do contentEditable) viram quebras de linha.
        if (i > 0) out.push('<br>');
        walk(child);
        return;
      }
      const t = tag.toLowerCase();
      let attrs = '';
      if (t === 'a') {
        const h = child.getAttribute('href');
        if (h) attrs += ` href="${escAttr(h)}"`;
        if (child.getAttribute('target') === '_blank') attrs += ' target="_blank" rel="noreferrer noopener"';
      }
      if (t === 'span' && child.getAttribute('style')) attrs += ` style="${escAttr(child.getAttribute('style')!)}"`;
      out.push(`<${t}${attrs}>`);
      walk(child);
      out.push(`</${t}>`);
    });
  };
  walk(doc.body);
  return out.join('').replace(/(<br>)+$/, '');
}

const JUSTIFY: Record<string, string> = { left: 'left', center: 'center', right: 'right', justify: 'space-between' };
const SOCIAL = ['instagram', 'facebook', 'x', 'linkedin', 'youtube', 'whatsapp'];

/** Marcação estática (HTML) de um widget renderizado pelo próprio app. */
function staticHtml(w: WidgetNode, ctx: WpContext): string {
  const env: RenderEnv = { site: ctx.site, pageId: '', mode: 'export', hrefForPage: (id) => pageToken(ctx.slugOf(id) ?? '') };
  return renderToStaticMarkup(createElement(ElementContent, { el: w, env }));
}

export function widgetBlock(w: WidgetNode, ctx: WpContext): string {
  const cls = `wb-el wb-t-${w.type} n-${w.id}`;
  const p = w.props;
  const link = href(w.link, ctx);
  const wrapLink = (inner: string) => (link ? `<a href="${escAttr(link.href)}"${link.newTab ? ' target="_blank" rel="noreferrer noopener"' : ''}>${inner}</a>` : inner);

  switch (w.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, Number(p.level) || 2));
      return block('heading', { level: level === 2 ? undefined : level, className: cls }, `<h${level} class="wp-block-heading ${cls}">${wrapLink(inlineHtml(p.html ?? ''))}</h${level}>`);
    }
    case 'text':
      return block('paragraph', { className: cls }, `<p class="${cls}">${wrapLink(inlineHtml(p.html ?? ''))}</p>`);
    case 'button': {
      const a = link ? ` href="${escAttr(link.href)}"${link.newTab ? ' target="_blank" rel="noreferrer noopener"' : ''}` : '';
      const btn = block(
        'button',
        { className: 'wb-btn', linkTarget: link?.newTab ? '_blank' : undefined, rel: link?.newTab ? 'noreferrer noopener' : undefined },
        `<div class="wp-block-button wb-btn"><a class="wp-block-button__link wp-element-button"${a}>${escText(p.label ?? '')}</a></div>`,
      );
      return block('buttons', { className: `wb-btns n-${w.id}` }, `<div class="wp-block-buttons wb-btns n-${w.id}">${btn}</div>`);
    }
    case 'image': {
      if (!p.src) return '';
      const img = `<img src="${escAttr(src(p.src))}" alt="${escAttr(p.alt ?? '')}"/>`;
      return block(
        'image',
        { sizeSlug: 'full', linkDestination: link ? 'custom' : 'none', linkTarget: link?.newTab ? '_blank' : undefined, className: cls },
        `<figure class="wp-block-image size-full ${cls}">${wrapLink(img)}</figure>`,
      );
    }
    case 'gallery': {
      const images: { src: string; alt?: string }[] = p.images ?? [];
      if (!images.length) return '';
      const cols = Math.max(1, Number(p.columns) || 3);
      const inner = images
        .map((im) =>
          block(
            'image',
            { sizeSlug: 'large', linkDestination: 'none', lightbox: p.lightbox ? { enabled: true } : undefined },
            `<figure class="wp-block-image size-large"><img src="${escAttr(src(im.src))}" alt="${escAttr(im.alt ?? '')}"/></figure>`,
          ),
        )
        .join('\n');
      return block('gallery', { columns: cols, linkTo: 'none', className: cls }, `<figure class="wp-block-gallery has-nested-images columns-${cols} is-cropped ${cls}">${inner}</figure>`);
    }
    case 'video': {
      const v = videoSource(p.url ?? '', false);
      if (!v) return '';
      if (v.kind === 'video') return block('video', { className: cls }, `<figure class="wp-block-video ${cls}"><video controls src="${escAttr(src(p.url))}"></video></figure>`);
      const provider = /vimeo/.test(p.url) ? 'vimeo' : 'youtube';
      const extra = `wp-embed-aspect-16-9 wp-has-aspect-ratio ${cls}`;
      return block(
        'embed',
        { url: p.url, type: 'video', providerNameSlug: provider, responsive: true, className: extra },
        `<figure class="wp-block-embed is-type-video is-provider-${provider} wp-block-embed-${provider} ${extra}"><div class="wp-block-embed__wrapper">\n${escText(p.url)}\n</div></figure>`,
      );
    }
    case 'shape':
      return block('group', { className: cls, layout: { type: 'default' } }, `<div class="wp-block-group ${cls}"></div>`);
    case 'line':
      return block('separator', { className: cls }, `<hr class="wp-block-separator has-alpha-channel-opacity ${cls}"/>`);
    case 'menu': {
      const pages = ctx.site.pages.filter((pg) => !pg.hideFromMenu);
      const items = pages.map((pg) => block('navigation-link', { label: pg.name, url: pageToken(ctx.slugOf(pg.id) ?? ''), kind: 'custom', isTopLevelLink: true })).join('\n');
      return block(
        'navigation',
        {
          overlayMenu: 'mobile',
          className: `wb-nav n-${w.id}`,
          layout: { type: 'flex', justifyContent: JUSTIFY[w.style.textAlign ?? 'left'] ?? 'left', orientation: p.direction === 'column' ? 'vertical' : 'horizontal' },
        },
        items,
      );
    }
    case 'social': {
      const nets = SOCIAL.filter((k) => p[k]);
      const inner = nets.map((k) => block('social-link', { url: p[k], service: k })).join('\n');
      const c = `is-style-logos-only wb-social-wp n-${w.id}`;
      return block('social-links', { className: c, layout: { type: 'flex', justifyContent: JUSTIFY[w.style.textAlign ?? 'left'] ?? 'left' } }, `<ul class="wp-block-social-links ${c}">${inner}</ul>`);
    }
    case 'form': {
      const button = p.buttonColor ? resolveColor(p.buttonColor) : undefined;
      return block('wbs/form', { formId: w.id, fields: p.fields ?? [], submitLabel: p.submitLabel || 'Enviar', buttonColor: button, email: p.email || undefined, className: cls });
    }
    case 'comments': {
      const parts = [
        p.title ? block('heading', { level: 3, className: 'wb-comments-title' }, `<h3 class="wp-block-heading wb-comments-title">${escText(p.title)}</h3>`) : '',
        block(
          'comment-template',
          {},
          [block('comment-author-name'), block('comment-date'), block('comment-content'), block('comment-reply-link')].join('\n'),
        ),
        block('comments-pagination', {}, [block('comments-pagination-previous'), block('comments-pagination-numbers'), block('comments-pagination-next')].join('\n')),
        p.showForm ? block('post-comments-form') : '',
      ].filter(Boolean);
      return block('comments', { className: cls }, `<div class="wp-block-comments ${cls}">${parts.join('\n')}</div>`);
    }
    case 'login':
      return block('loginout', { displayLoginAsForm: !!p.asForm, className: cls });
    case 'map':
    case 'embed':
    case 'themeToggle':
      return block('html', {}, `<div class="${cls}">${staticHtml(w, ctx)}</div>`);
  }
}

export function nodeBlock(node: FlowNode, ctx: WpContext): string {
  if (node.kind === 'widget') return widgetBlock(node, ctx);
  const c = node as ContainerNode;
  const tag = c.tag ?? 'div';
  const cls = `wb-c n-${c.id}`;
  const inner = c.children.map((n) => nodeBlock(n, ctx)).filter(Boolean).join('\n');
  return block('group', { tagName: tag === 'div' ? undefined : tag, className: cls, layout: { type: 'default' } }, `<${tag} class="wp-block-group ${cls}">${inner}</${tag}>`);
}

/** Uma seção vira um grupo (containers) ou o bloco "Seção livre" do plugin. */
export function sectionBlock(section: Section, ctx: WpContext): string {
  if (isFlow(section)) {
    const tag = section.kind === 'body' ? 'section' : 'div';
    const cls = `wb-section wb-flow s-${section.id}`;
    return block('group', { tagName: tag === 'div' ? undefined : tag, className: cls, layout: { type: 'default' } }, `<${tag} class="wp-block-group ${cls}">${nodeBlock(section.root, ctx)}</${tag}>`);
  }
  const env: RenderEnv = { site: ctx.site, pageId: '', mode: 'export', hrefForPage: (id) => `{{wbs-page:${ctx.slugOf(id) ?? ''}}}` };
  const html = renderToStaticMarkup(createElement(RenderedSection, { section, env })).split(ASSET).join('{{wbs:theme}}/');
  return block('wbs/free-section', { sectionId: section.id, html, css: layoutCss([section], 'responsive') });
}
