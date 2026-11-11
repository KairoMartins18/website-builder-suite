// Gera um tema de blocos do WordPress (.zip) a partir de um site do editor.
import type { CSSProperties } from 'react';
import type { Section, Site, WidgetNode } from '../types';
import { MOBILE_MAX } from '../types';
import { collectFonts, darkSchemeCss, darkSectionsCss, resolveColor, THEME_COLOR_KEYS } from '../lib/theme';
import { fontStack, googleFontsUrl } from '../lib/fonts';
import { cssText, flowCss, isFlow, walk } from '../lib/flow';
import { slugify } from '../lib/siteOps';
import { createZip, type ZipEntry } from '../lib/zip';
import { BASE_CSS, mobileMenuCss, SCHEME_BOOT_SCRIPT, SITE_SCRIPT } from '../render/baseCss';
import { sectionBackground } from '../render/SiteRenderer';
import { ASSET, block, sectionBlock, type WpContext } from './blocks';
import LICENSE_TEXT from '../../LICENSE?raw';

const THEME_VERSION = '1.0.0';

const EXT: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'video/mp4': 'mp4', 'video/webm': 'webm' };

/** Troca imagens embutidas (data URLs) por arquivos em assets/images/. */
async function extractAssets(site: Site): Promise<{ site: Site; files: ZipEntry[] }> {
  const files: ZipEntry[] = [];
  const seen = new Map<string, string>();
  const walkValue = async (v: unknown): Promise<unknown> => {
    if (typeof v === 'string' && v.startsWith('data:')) {
      const known = seen.get(v);
      if (known) return known;
      const ext = EXT[v.slice(5, v.search(/[;,]/))];
      if (!ext) return v;
      const path = `assets/images/media-${seen.size + 1}.${ext}`;
      files.push({ path, data: new Uint8Array(await (await fetch(v)).arrayBuffer()) });
      seen.set(v, ASSET + path);
      return ASSET + path;
    }
    if (Array.isArray(v)) return Promise.all(v.map(walkValue));
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = await walkValue(x);
      return out;
    }
    return v;
  };
  return { site: (await walkValue(site)) as Site, files };
}

// ---------------- CSS do tema ----------------

const WP_CSS = `
.wp-site-blocks{padding:0}
.wb-c.wb-c>*,.wb-section.wb-section>*,.wb-main.wb-main>*{margin-block:0}
.wb-sticky-part{position:sticky;top:var(--wp-admin--admin-bar--height,0px);z-index:50}
.wb-btns{display:flex;flex-wrap:wrap;gap:12px}
.wb-btns .wp-block-button__link{display:inline-flex;align-items:center;justify-content:center;padding:12px 28px;background:transparent;color:inherit;text-decoration:none;transition:filter .15s}
.wb-btns .wp-block-button__link:hover{filter:brightness(.92)}
.wb-nav a{color:inherit;text-decoration:none}
.wb-nav .current-menu-item>a{color:var(--wb-menu-active,currentColor);text-decoration:underline;text-underline-offset:6px}
.wb-el.wp-block-image{overflow:hidden}
.wb-el.wp-block-image img{display:block}
.wb-wp-content{max-width:760px;margin:0 auto;padding:64px 24px}
.wb-archive-title{max-width:1140px;margin:0 auto!important;padding:48px 24px 0;font-family:var(--wb-font-heading)}
.wb-wp-content>*+*{margin-block-start:1.2em}
.wb-wp-posts .wp-block-post{padding:24px 0;border-bottom:1px solid rgba(127,127,127,.25)}
.wb-t-comments .wp-block-comment-template{list-style:none;padding:0}
.wp-block-post-template.wb-feed-wp{gap:28px;list-style:none;padding:0;margin:0}
.wb-feed-wp.wb-feed-list>li+li{margin-top:28px}
.wb-post-img img{border-radius:10px;aspect-ratio:16/9;object-fit:cover;width:100%}
.wb-post-cat-wp a{display:inline-block;padding:2px 10px;border-radius:999px;background:color-mix(in srgb,var(--wb-primary) 14%,transparent);color:var(--wb-primary);font-size:.8em;font-weight:600;text-decoration:none}
.wb-post-title a{color:inherit;text-decoration:none}
.wb-post-meta{font-size:.88em;opacity:.75;gap:6px 14px}
.wp-block-post-excerpt__more-link{color:var(--wb-primary);font-weight:600}
.wp-block-query-pagination{margin-top:24px;gap:8px}
.wb-widget ul{list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:8px}
.wb-widget a{color:inherit;text-decoration:none}
.wb-t-postFeaturedImage img{width:100%;height:100%;object-fit:cover;border-radius:inherit}
.wb-post-nav a{color:inherit;text-decoration:none}
@media (max-width:767px){.wb-feed-wp.wb-feed-wp{grid-template-columns:1fr!important}}
`;

/** Regras extras por tipo de widget (onde o bloco do WordPress tem estrutura própria). */
function widgetExtraCss(w: WidgetNode): string {
  const id = `.n-${w.id}`;
  const p = w.props;
  const s = w.style;
  switch (w.type) {
    case 'image':
      return `${id} img{object-fit:${p.fit ?? 'cover'};width:100%}`;
    case 'menu':
      return `${id}{--wb-menu-active:${resolveColor(p.activeColor) ?? 'currentColor'}}${id} .wp-block-navigation__container{gap:${p.gap ?? 24}px}`;
    case 'social':
      return `${id}.wp-block-social-links{font-size:${p.size ?? 24}px;gap:${Math.round((p.size ?? 24) / 2)}px}${id} .wp-social-link{color:${resolveColor(p.iconColor) ?? 'currentColor'};background:none}`;
    case 'gallery':
      return `${id}{gap:${p.gap ?? 8}px;--wp--style--unstable-gallery-gap:${p.gap ?? 8}px}${id} img{border-radius:${p.radius ?? 0}px}`;
    case 'line':
      return `${id}.wp-block-separator{width:auto;max-width:none;border:0;border-top:${s.borderWidth ?? 2}px ${s.borderStyle ?? 'solid'} ${resolveColor(s.borderColor) ?? 'currentColor'};background:none;opacity:1;height:0;min-height:0;align-self:stretch}`;
    default:
      return '';
  }
}

function sectionCss(s: Section): string {
  let css = `.s-${s.id}{${cssText(sectionBackground(s) as CSSProperties)}}`;
  if (s.background.overlay) css += `.s-${s.id}::before{content:"";position:absolute;inset:0;background:${resolveColor(s.background.overlay)};pointer-events:none}`;
  if (s.mobileHidden) css += `@media (max-width:${MOBILE_MAX}px){.s-${s.id}{display:none}}`;
  return css;
}

function themeCss(site: Site, sections: Section[]): string {
  const vars =
    THEME_COLOR_KEYS.map(({ key }) => `--wb-${key}:var(--wp--preset--color--${key});`).join('') +
    `--wb-font-heading:var(--wp--preset--font-family--heading);--wb-font-body:var(--wp--preset--font-family--body);`;
  const flows = sections.filter(isFlow);
  const widgets: WidgetNode[] = [];
  for (const s of flows) for (const { node } of walk(s.root)) if (node.kind === 'widget') widgets.push(node);
  const layout = flowCss(sections, 'responsive', { styleTarget: (w) => (w.type === 'button' ? ' .wp-block-button__link' : undefined) });
  const css = [
    `/* Gerado pelo Website Builder Suite — não edite: exporte o tema novamente a partir do app. */`,
    `:root{${vars}}`,
    BASE_CSS,
    `.wb-free{zoom:var(--wb-zoom,1)}`,
    `@media (max-width:${MOBILE_MAX}px){${mobileMenuCss('body')}}`,
    WP_CSS,
    widgets.map(widgetExtraCss).join('\n'),
    layout,
    sections.filter(isFlow).map(sectionCss).join('\n'),
    darkSchemeCss(site, ':root', (key) => [`--wp--preset--color--${key}`]),
    darkSectionsCss(site, sections, ':root'),
  ].join('\n');
  // URLs de imagens no CSS ficam relativas a assets/css/.
  return css.split(ASSET + 'assets/').join('../');
}

// ---------------- arquivos PHP / HTML ----------------

const php = (s: string) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

/** Escapa PHP vindo de conteúdo do usuário e troca os marcadores por chamadas PHP. */
function toPhp(content: string, prefix: string): string {
  return content
    .replace(/<\?/g, '&lt;?')
    .replace(/\{\{wp-img:([a-zA-Z0-9/._-]+)\}\}/g, (_, p) => `<?php echo esc_url( get_theme_file_uri( '${p}' ) ); ?>`)
    .replace(/\{\{wp-page:([a-z0-9-]*)\}\}/g, (_, s) => `<?php echo esc_url( ${prefix}_page_url( '${s}' ) ); ?>`);
}

function pattern(title: string, slug: string, category: string, content: string, prefix: string): string {
  return `<?php
/**
 * Title: ${title.replace(/\*\//g, '')}
 * Slug: ${slug}
 * Categories: ${category}
 * Inserter: no
 */
?>
${toPhp(content, prefix)}
`;
}

const headerPart = (sticky: boolean) => block('template-part', { slug: 'header', tagName: 'header', className: sticky ? 'wb-sticky-part' : undefined });
const footerPart = () => block('template-part', { slug: 'footer', tagName: 'footer' });
const mainWith = (inner: string, className = 'wb-main') => block('group', { tagName: 'main', className, layout: { type: 'default' } }, `<main class="wp-block-group ${className}">${inner}</main>`);

function functionsPhp(site: Site, slug: string, prefix: string, pages: { slug: string; title: string; comments: boolean }[], homeSlug: string, fontsUrl: string | null, blogSlug: string | null): string {
  const dark = site.settings.darkMode && site.settings.darkMode !== 'off';
  const pageList = pages.map((p) => `\t\tarray( '${php(p.slug)}', '${php(p.title)}', ${p.comments ? 'true' : 'false'} ),`).join('\n');
  return `<?php
/**
 * Funções do tema ${site.name.replace(/\*\//g, '')} — gerado pelo Website Builder Suite.
 *
 * @package ${slug}
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( '${prefix.toUpperCase()}_VERSION', '${THEME_VERSION}' );

/**
 * Endereço de uma página pelo slug (funciona com ou sem links permanentes).
 *
 * @param string $slug Slug da página ('' = página inicial).
 * @return string
 */
function ${prefix}_page_url( $slug ) {
	if ( '' === $slug ) {
		return home_url( '/' );
	}
	$page = get_page_by_path( $slug );
	return $page ? get_permalink( $page ) : home_url( '/' . $slug . '/' );
}

/**
 * Recursos do tema.
 */
function ${prefix}_setup() {
	add_theme_support( 'wp-block-styles' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'editor-styles' );
	add_editor_style( array( 'assets/css/site.css'${fontsUrl ? `, '${php(fontsUrl)}'` : ''} ) );
}
add_action( 'after_setup_theme', '${prefix}_setup' );

/**
 * CSS e JavaScript do site.
 */
function ${prefix}_assets() {
${fontsUrl ? `\twp_enqueue_style( '${prefix}-fonts', '${php(fontsUrl)}', array(), null ); // phpcs:ignore WordPress.WP.EnqueuedResourceParameters.MissingVersion\n` : ''}\twp_enqueue_style( '${prefix}-site', get_theme_file_uri( 'assets/css/site.css' ), array(), ${prefix.toUpperCase()}_VERSION );
	wp_enqueue_script( '${prefix}-site', get_theme_file_uri( 'assets/js/site.js' ), array(), ${prefix.toUpperCase()}_VERSION, array( 'in_footer' => true ) );
}
add_action( 'wp_enqueue_scripts', '${prefix}_assets' );
${
  dark
    ? `
/**
 * Aplica a preferência claro/escuro salva antes de a página aparecer.
 */
function ${prefix}_scheme_boot() {
	wp_print_inline_script_tag( "${SCHEME_BOOT_SCRIPT.replace(/"/g, '\\"')}" );
}
add_action( 'wp_head', '${prefix}_scheme_boot', 1 );
`
    : ''
}
/**
 * Classe usada pelo CSS gerado.
 *
 * @param array $classes Classes do body.
 * @return array
 */
function ${prefix}_body_class( $classes ) {
	$classes[] = 'wb-site';
	return $classes;
}
add_filter( 'body_class', '${prefix}_body_class' );

/**
 * Categoria dos padrões com o conteúdo das páginas.
 */
function ${prefix}_patterns() {
	register_block_pattern_category( '${prefix}-pages', array( 'label' => __( 'Páginas do site', '${slug}' ) ) );
}
add_action( 'init', '${prefix}_patterns' );

/**
 * Renderização de reserva dos blocos do plugin Website Builder Suite:
 * o site continua exibindo o conteúdo mesmo sem o plugin.
 */
function ${prefix}_fallback_blocks() {
	$registry = WP_Block_Type_Registry::get_instance();
	if ( ! $registry->is_registered( 'wbs/free-section' ) ) {
		register_block_type(
			'wbs/free-section',
			array(
				'attributes'      => array(
					'html'      => array( 'type' => 'string', 'default' => '' ),
					'css'       => array( 'type' => 'string', 'default' => '' ),
					'sectionId' => array( 'type' => 'string', 'default' => '' ),
				),
				'render_callback' => function ( $attributes ) {
					$html = str_replace( '{{wbs:theme}}', esc_url( get_stylesheet_directory_uri() ), $attributes['html'] );
					$html = preg_replace_callback(
						'/\\{\\{wbs-page:([a-z0-9\\-]*)\\}\\}/',
						function ( $m ) {
							return esc_url( ${prefix}_page_url( $m[1] ) );
						},
						$html
					);
					return '<style>' . wp_strip_all_tags( $attributes['css'] ) . '</style>' . $html;
				},
			)
		);
	}
	if ( ! $registry->is_registered( 'wbs/form' ) ) {
		register_block_type(
			'wbs/form',
			array(
				'attributes'      => array(
					'formId'      => array( 'type' => 'string', 'default' => '' ),
					'fields'      => array( 'type' => 'array', 'default' => array() ),
					'submitLabel' => array( 'type' => 'string', 'default' => '' ),
					'buttonColor' => array( 'type' => 'string', 'default' => '' ),
					'email'       => array( 'type' => 'string', 'default' => '' ),
				),
				'render_callback' => function () {
					if ( ! current_user_can( 'install_plugins' ) ) {
						return '';
					}
					return '<p class="wb-wp-note">' . esc_html__( 'Formulário de contato: instale e ative o plugin gratuito "Website Builder Suite" para exibi-lo e receber as mensagens. (Aviso visível só para administradores.)', '${slug}' ) . '</p>';
				},
			)
		);
	}
}
add_action( 'init', '${prefix}_fallback_blocks', 20 );

/**
 * Ao ativar o tema: cria as páginas do site (se não existirem) e define a página inicial.
 */
function ${prefix}_create_pages() {
	$pages = array(
${pageList}
	);
	foreach ( $pages as $i => $p ) {
		if ( ! get_page_by_path( $p[0] ) ) {
			wp_insert_post(
				array(
					'post_type'      => 'page',
					'post_status'    => 'publish',
					'post_name'      => $p[0],
					'post_title'     => $p[1],
					'menu_order'     => $i,
					'comment_status' => $p[2] ? 'open' : 'closed',
				)
			);
		}
	}
${
    blogSlug !== null && blogSlug === homeSlug
      ? `\t// A página inicial é o próprio blog.\n\tupdate_option( 'show_on_front', 'posts' );`
      : `\t$home = get_page_by_path( '${php(homeSlug)}' );
	if ( $home ) {
		update_option( 'show_on_front', 'page' );
		update_option( 'page_on_front', $home->ID );
	}${
    blogSlug
      ? `
	$blog = get_page_by_path( '${php(blogSlug)}' );
	if ( $blog ) {
		update_option( 'page_for_posts', $blog->ID );
	}`
      : ''
  }`
  }
}
add_action( 'after_switch_theme', '${prefix}_create_pages' );

/**
 * Recomenda o plugin gratuito para os formulários.
 */
function ${prefix}_plugin_notice() {
	if ( defined( 'WBS_PLUGIN_VERSION' ) || ! current_user_can( 'install_plugins' ) ) {
		return;
	}
	echo '<div class="notice notice-info is-dismissible"><p>' . esc_html__( 'Tema criado no Website Builder Suite. Instale o plugin gratuito "Website Builder Suite" para ativar os formulários de contato.', '${slug}' ) . '</p></div>';
}
add_action( 'admin_notices', '${prefix}_plugin_notice' );
`;
}

function themeJson(site: Site): string {
  const t = site.theme;
  return JSON.stringify(
    {
      $schema: 'https://schemas.wp.org/trunk/theme.json',
      version: 3,
      settings: {
        appearanceTools: true,
        useRootPaddingAwareAlignments: false,
        layout: { contentSize: '760px', wideSize: '1140px' },
        color: { palette: THEME_COLOR_KEYS.map(({ key, label }) => ({ slug: key, name: label, color: t.colors[key] })) },
        typography: {
          fontFamilies: [
            { slug: 'heading', name: `Títulos (${t.fonts.heading})`, fontFamily: fontStack(t.fonts.heading) },
            { slug: 'body', name: `Corpo (${t.fonts.body})`, fontFamily: fontStack(t.fonts.body) },
          ],
        },
      },
      styles: {
        color: { background: 'var:preset|color|background', text: 'var:preset|color|text' },
        typography: { fontFamily: 'var:preset|font-family|body', lineHeight: '1.6' },
        spacing: { blockGap: '0px', padding: { top: '0px', right: '0px', bottom: '0px', left: '0px' } },
        elements: {
          link: { color: { text: 'var:preset|color|primary' } },
          heading: { typography: { fontFamily: 'var:preset|font-family|heading' } },
          button: { color: { background: 'var:preset|color|primary', text: '#ffffff' }, border: { radius: '8px' } },
        },
      },
      templateParts: [
        { name: 'header', title: 'Cabeçalho', area: 'header' },
        { name: 'footer', title: 'Rodapé', area: 'footer' },
      ],
    },
    null,
    '\t',
  );
}

/** Imagem de capa do tema (Aparência → Temas): 1200×900. */
async function screenshot(site: Site): Promise<Uint8Array> {
  const c = document.createElement('canvas');
  c.width = 1200;
  c.height = 900;
  const g = c.getContext('2d')!;
  const col = site.theme.colors;
  g.fillStyle = col.background;
  g.fillRect(0, 0, 1200, 900);
  const grad = g.createLinearGradient(0, 0, 1200, 560);
  grad.addColorStop(0, col.primary);
  grad.addColorStop(1, col.secondary);
  g.fillStyle = grad;
  g.fillRect(0, 0, 1200, 560);
  g.fillStyle = '#ffffff';
  g.font = `700 88px ${fontStack(site.theme.fonts.heading)}`;
  g.fillText(site.name.slice(0, 22), 80, 300);
  g.font = `400 34px ${fontStack(site.theme.fonts.body)}`;
  g.fillText('Tema criado no Website Builder Suite', 80, 370);
  THEME_COLOR_KEYS.forEach(({ key }, i) => {
    g.fillStyle = col[key];
    g.fillRect(80 + i * 170, 640, 140, 140);
    g.strokeStyle = 'rgba(0,0,0,.12)';
    g.strokeRect(80 + i * 170, 640, 140, 140);
  });
  const blob = await new Promise<Blob>((r) => c.toBlob((b) => r(b!), 'image/png'));
  return new Uint8Array(await blob.arrayBuffer());
}

// ---------------- montagem ----------------

export function themeSlug(site: Site): string {
  const s = slugify(site.name).slice(0, 40) || 'meu-site';
  return /^[a-z]/.test(s) ? s : `site-${s}`;
}

export async function exportWordPressThemeFiles(original: Site): Promise<{ slug: string; files: ZipEntry[] }> {
  const { site, files: media } = await extractAssets(original);
  const slug = themeSlug(site);
  const prefix = slug.replace(/-/g, '_');
  const home = site.pages.find((p) => p.id === site.homePageId) ?? site.pages[0];
  const slugOf = (id: string) => {
    const p = site.pages.find((x) => x.id === id);
    return p ? (p.id === home.id ? '' : p.slug) : undefined;
  };
  const ctx: WpContext = { site, slugOf };
  const homeSlug = home.slug || 'inicio';
  const fontsUrl = googleFontsUrl(collectFonts(site));

  const allSections: Section[] = [site.header, site.footer, ...site.pages.flatMap((p) => p.sections)];
  const sticky = !!site.header.sticky;
  const T = (...lines: string[]) => lines.join('\n') + '\n';
  const files: ZipEntry[] = [];
  const add = (path: string, data: string | Uint8Array) => files.push({ path: `${slug}/${path}`, data });

  add(
    'style.css',
    `/*
Theme Name: ${site.name.replace(/\*\//g, '')}
Author: Website Builder Suite
Description: Tema de blocos criado no Website Builder Suite (construtor de sites low-code, gratuito e open source). Edite textos e imagens em Aparência → Editor; para mudar o layout, edite no aplicativo e exporte novamente.
Requires at least: 6.5
Tested up to: 6.8
Requires PHP: 7.4
Version: ${THEME_VERSION}
License: GNU General Public License v2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html
Text Domain: ${slug}
Tags: full-site-editing, block-patterns, custom-colors, accessibility-ready
*/

/* Os estilos do site ficam em assets/css/site.css. */
`,
  );
  add('theme.json', themeJson(site));
  const blogPage = site.pages.find((p) => p.role === 'blog');
  const postPage = site.pages.find((p) => p.role === 'post');
  const blogSlug = blogPage ? (blogPage.id === home.id ? homeSlug : blogPage.slug) : null;
  const hasComments = (sections: Section[]) => sections.some((s) => isFlow(s) && [...walk(s.root)].some(({ node }) => node.kind === 'widget' && node.type === 'comments'));
  add(
    'functions.php',
    functionsPhp(
      site,
      slug,
      prefix,
      site.pages.filter((p) => p.role !== 'post').map((p) => ({ slug: p.id === home.id ? homeSlug : p.slug, title: p.name, comments: hasComments(p.sections) })),
      homeSlug,
      fontsUrl,
      blogSlug,
    ),
  );
  add('assets/css/site.css', themeCss(site, allSections));
  add('assets/js/site.js', SITE_SCRIPT + '\n');
  add('screenshot.png', await screenshot(site));
  add('LICENSE', LICENSE_TEXT);
  for (const m of media) add(m.path, m.data);

  // Cabeçalho e rodapé (padrões PHP para resolver URLs de imagens e páginas).
  add('patterns/header.php', pattern('Cabeçalho', `${slug}/header`, `${prefix}-pages`, sectionBlock(site.header, ctx), prefix));
  add('patterns/footer.php', pattern('Rodapé', `${slug}/footer`, `${prefix}-pages`, sectionBlock(site.footer, ctx), prefix));
  add('parts/header.html', block('pattern', { slug: `${slug}/header` }) + '\n');
  add('parts/footer.html', block('pattern', { slug: `${slug}/footer` }) + '\n');

  // Uma página do editor = um padrão + um template (front-page.html ou page-<slug>.html).
  for (const page of site.pages) {
    const isHome = page.id === home.id;
    const key = isHome ? 'home' : page.slug;
    const content = page.sections.map((s) => sectionBlock(s, ctx)).join('\n\n');
    add(`patterns/page-${key}.php`, pattern(`Página: ${page.name}`, `${slug}/page-${key}`, `${prefix}-pages`, content, prefix));
    const pat = block('pattern', { slug: `${slug}/page-${key}` });
    if (page.role === 'post') {
      // Modelo de cada post (o conteúdo vem do editor de posts do WordPress).
      add('templates/single.html', T(headerPart(sticky), mainWith(pat), footerPart()));
    } else if (page.role === 'blog') {
      // Página de posts + listagens de categoria, tag, autor, data e busca.
      add('templates/home.html', T(headerPart(sticky), mainWith(pat), footerPart()));
      const titled = T(block('query-title', { type: 'archive', className: 'wb-archive-title' }), pat);
      add('templates/archive.html', T(headerPart(sticky), mainWith(titled), footerPart()));
      add('templates/search.html', T(headerPart(sticky), mainWith(T(block('query-title', { type: 'search', className: 'wb-archive-title' }), pat)), footerPart()));
    } else {
      add(`templates/${isHome ? 'front-page' : `page-${page.slug}`}.html`, T(headerPart(sticky), mainWith(pat), footerPart()));
    }
  }

  // Páginas, posts e listagens criados direto no WordPress.
  add('templates/page.html', T(headerPart(sticky), mainWith(T(block('post-title', { level: 1 }), block('post-content')), 'wb-wp-content'), footerPart()));
  if (!postPage)
    add(
    'templates/single.html',
    T(
      headerPart(sticky),
      mainWith(
        T(
          block('post-title', { level: 1 }),
          block('post-date'),
          block('post-featured-image'),
          block('post-content'),
          block('comments', { className: 'wb-t-comments' }, `<div class="wp-block-comments wb-t-comments">${T(block('comments-title'), block('comment-template', {}, T(block('comment-author-name'), block('comment-date'), block('comment-content'), block('comment-reply-link'))), block('post-comments-form'))}</div>`),
        ),
        'wb-wp-content',
      ),
      footerPart(),
    ),
  );
  const query = block(
    'query',
    { queryId: 0, query: { perPage: 10, pages: 0, offset: 0, postType: 'post', order: 'desc', orderBy: 'date', inherit: true }, className: 'wb-wp-posts' },
    `<div class="wp-block-query wb-wp-posts">${T(
      block('post-template', {}, T(block('post-title', { isLink: true, level: 2 }), block('post-date'), block('post-excerpt'))),
      block('query-pagination', {}, T(block('query-pagination-previous'), block('query-pagination-numbers'), block('query-pagination-next'))),
      block('query-no-results', {}, block('paragraph', {}, '<p>Nenhum conteúdo encontrado.</p>')),
    )}</div>`,
  );
  add('templates/index.html', T(headerPart(sticky), mainWith(T(block('query-title', { type: 'archive' }), query), 'wb-wp-content'), footerPart()));
  add(
    'templates/404.html',
    T(
      headerPart(sticky),
      mainWith(T(block('heading', { level: 1 }, '<h1 class="wp-block-heading">Página não encontrada</h1>'), block('paragraph', {}, '<p>O endereço pode ter mudado. Use o menu para continuar navegando.</p>')), 'wb-wp-content'),
      footerPart(),
    ),
  );
  add(
    'readme.txt',
    `=== ${site.name} ===\nRequires at least: 6.5\nTested up to: 6.8\nRequires PHP: 7.4\nStable tag: ${THEME_VERSION}\nLicense: GPLv2 or later\nLicense URI: https://www.gnu.org/licenses/gpl-2.0.html\n\nTema de blocos criado no Website Builder Suite.\n\n== Instalação ==\n\n1. Aparência → Temas → Adicionar novo → Enviar tema, escolha o .zip e ative.\n2. As páginas do site são criadas automaticamente ao ativar.\n3. Instale o plugin gratuito "Website Builder Suite" para ativar os formulários de contato.\n\n== Edição ==\n\nTextos, imagens e botões: Aparência → Editor → Modelos. Layout: edite no aplicativo e exporte novamente.\n`,
  );
  return { slug, files };
}

export async function exportWordPressThemeZip(site: Site): Promise<{ blob: Blob; slug: string }> {
  const { slug, files } = await exportWordPressThemeFiles(site);
  return { blob: createZip(files), slug };
}

// ---------------- plugin ----------------

const PLUGIN_SOURCES = import.meta.glob('/wordpress/plugin/website-builder-suite/**/*', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export function pluginFiles(): ZipEntry[] {
  const files = Object.entries(PLUGIN_SOURCES).map(([path, data]) => ({ path: path.replace('/wordpress/plugin/', ''), data }));
  files.push({ path: 'website-builder-suite/LICENSE', data: LICENSE_TEXT });
  return files;
}

export const pluginZip = () => createZip(pluginFiles());

