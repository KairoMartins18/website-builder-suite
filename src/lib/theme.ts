import type { CSSProperties } from 'react';
import type { ElementStyle, Section, Site, SiteElement, Theme, ThemeColors } from '../types';
import { fontStack } from './fonts';

export const THEME_COLOR_KEYS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'primary', label: 'Principal' },
  { key: 'secondary', label: 'Secundária' },
  { key: 'accent', label: 'Destaque' },
  { key: 'text', label: 'Texto' },
  { key: 'background', label: 'Fundo' },
  { key: 'muted', label: 'Suave' },
];

/** "theme:primary" → var(--wb-primary); "theme:background/60" → 60% de opacidade (color-mix). */
export function resolveColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('theme:')) {
    const [key, alpha] = value.slice(6).split('/');
    return alpha ? `color-mix(in srgb, var(--wb-${key}) ${Number(alpha)}%, transparent)` : `var(--wb-${key})`;
  }
  return value;
}

/** Converte uma cor (inclusive do tema) para #hex, para o <input type=color>. */
export function colorToHex(value: string | undefined, theme: Theme): string {
  if (!value) return '#000000';
  if (value.startsWith('theme:')) value = theme.colors[value.slice(6).split('/')[0] as keyof ThemeColors] ?? '#000000';
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) return '#' + [...value.slice(1)].map((c) => c + c).join('');
  const m = value.match(/rgba?\((\d+)\D+(\d+)\D+(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('');
  return '#000000';
}

export function resolveFont(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value === 'theme:heading') return 'var(--wb-font-heading)';
  if (value === 'theme:body') return 'var(--wb-font-body)';
  return fontStack(value);
}

export function themeVars(theme: Theme): CSSProperties {
  const vars: Record<string, string> = {};
  for (const { key } of THEME_COLOR_KEYS) vars[`--wb-${key}`] = theme.colors[key];
  vars['--wb-font-heading'] = fontStack(theme.fonts.heading);
  vars['--wb-font-body'] = fontStack(theme.fonts.body);
  return vars as CSSProperties;
}

const SHADOWS = {
  none: undefined,
  sm: '0 1px 3px rgba(0,0,0,.12), 0 1px 2px rgba(0,0,0,.08)',
  md: '0 8px 24px rgba(0,0,0,.12)',
  lg: '0 20px 50px rgba(0,0,0,.2)',
};

/** Estilo visual de um elemento (livre ou widget de container). */
export function elementCss(el: Pick<SiteElement, 'type' | 'style'>): CSSProperties {
  const s: ElementStyle = el.style;
  const css: CSSProperties = {};
  if (s.color) css.color = resolveColor(s.color);
  if (s.background) css.background = resolveColor(s.background);
  if (s.fontFamily) css.fontFamily = resolveFont(s.fontFamily);
  if (s.fontSize) css.fontSize = s.fontSize;
  if (s.fontWeight) css.fontWeight = s.fontWeight;
  if (s.fontStyle) css.fontStyle = s.fontStyle;
  if (s.textAlign) css.textAlign = s.textAlign;
  if (s.lineHeight) css.lineHeight = s.lineHeight;
  if (s.letterSpacing) css.letterSpacing = s.letterSpacing;
  if (s.textTransform && s.textTransform !== 'none') css.textTransform = s.textTransform;
  if (s.borderRadius) css.borderRadius = s.borderRadius;
  if (el.type !== 'line' && s.borderWidth) {
    css.border = `${s.borderWidth}px ${s.borderStyle ?? 'solid'} ${resolveColor(s.borderColor) ?? 'currentColor'}`;
  }
  if (s.opacity !== undefined && s.opacity < 1) css.opacity = s.opacity;
  if (s.padding) css.padding = s.padding;
  if (s.shadow && s.shadow !== 'none') css.boxShadow = SHADOWS[s.shadow];
  if (s.backdropBlur) {
    css.backdropFilter = `blur(${s.backdropBlur}px) saturate(160%)`;
    css.WebkitBackdropFilter = css.backdropFilter;
  }
  return css;
}

/** Todas as fontes usadas pelo site (para carregar do Google Fonts). */
export function collectFonts(site: Site): string[] {
  const fonts = new Set<string>([site.theme.fonts.heading, site.theme.fonts.body]);
  const visit = (els: SiteElement[]) => {
    for (const el of els) if (el.style.fontFamily && !el.style.fontFamily.startsWith('theme:')) fonts.add(el.style.fontFamily);
  };
  visit(site.header.elements);
  visit(site.footer.elements);
  for (const p of site.pages) for (const s of p.sections) visit(s.elements);
  return [...fonts];
}

export const PALETTES: { name: string; colors: ThemeColors }[] = [
  { name: 'Oceano', colors: { primary: '#116dff', secondary: '#0b1f44', accent: '#ffb020', text: '#1d2433', background: '#ffffff', muted: '#f2f5fa' } },
  { name: 'Floresta', colors: { primary: '#2f7d4f', secondary: '#16301f', accent: '#e9b44c', text: '#1f2a22', background: '#fbfaf5', muted: '#eef2ea' } },
  { name: 'Terracota', colors: { primary: '#c8553d', secondary: '#2d1e1a', accent: '#f2a65a', text: '#2d1e1a', background: '#fffaf5', muted: '#f6ebe1' } },
  { name: 'Ameixa', colors: { primary: '#7b2cbf', secondary: '#240046', accent: '#ff6d00', text: '#1e1530', background: '#ffffff', muted: '#f3edfb' } },
  { name: 'Noturno', colors: { primary: '#38bdf8', secondary: '#e2e8f0', accent: '#f472b6', text: '#e2e8f0', background: '#0f172a', muted: '#1e293b' } },
  { name: 'Minimal', colors: { primary: '#111111', secondary: '#555555', accent: '#d4af37', text: '#111111', background: '#ffffff', muted: '#f4f4f4' } },
];

// ---------------- modo escuro dos sites ----------------

const NO_THEME: Theme = { colors: {} as ThemeColors, fonts: { heading: '', body: '' } };

function luminance(color: string): number {
  const h = colorToHex(color, NO_THEME);
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function mix(color: string, other: string, amount: number): string {
  const a = colorToHex(color, NO_THEME);
  const b = colorToHex(other, NO_THEME);
  return (
    '#' +
    [1, 3, 5]
      .map((i) => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - amount) + parseInt(b.slice(i, i + 2), 16) * amount).toString(16).padStart(2, '0'))
      .join('')
  );
}

/** Paleta escura derivada da clara (o usuário pode ajustar no painel Tema). */
export function deriveDarkColors(c: ThemeColors): ThemeColors {
  if (luminance(c.background) < 0.35) return { ...c }; // o tema já é escuro
  return {
    primary: luminance(c.primary) < 0.35 ? mix(c.primary, '#ffffff', 0.35) : c.primary,
    secondary: luminance(c.secondary) > 0.5 ? mix(c.secondary, '#000000', 0.6) : mix(c.secondary, '#000000', 0.25),
    accent: c.accent,
    text: '#e8eaf0',
    background: '#0f1117',
    muted: '#1b1e27',
  };
}

export const darkColors = (theme: Theme): ThemeColors => theme.darkColors ?? deriveDarkColors(theme.colors);

/** Seletores do modo escuro: automático (sistema) e forçado (botão / editor). */
export function darkSelectors(scope: '.wb-site' | ':root') {
  return scope === ':root'
    ? { auto: ':root:not([data-wb-scheme="light"])', forced: ':root[data-wb-scheme="dark"]' }
    : { auto: ':root:not([data-wb-scheme="light"]) .wb-site:not([data-wb-scheme="light"])', forced: ':root[data-wb-scheme="dark"] .wb-site,.wb-site[data-wb-scheme="dark"]' };
}

/** Fundos alternativos das seções no modo escuro. */
export function darkSectionsCss(site: Site, sections: Section[], scope: '.wb-site' | ':root' = '.wb-site'): string {
  if ((site.settings.darkMode ?? 'off') === 'off') return '';
  const { auto, forced } = darkSelectors(scope);
  let rules = '';
  for (const s of sections) {
    const d = s.background.dark;
    if (!d || (!d.color && !d.gradient)) continue;
    const decl =
      (d.color ? `background-color:${resolveColor(d.color)} !important;` : '') +
      (d.gradient ? `background-image:${d.gradient} !important;` : '');
    rules += `{SEL} .s-${s.id}{${decl}}`;
  }
  if (!rules) return '';
  const expand = (sel: string) => sel.split(',').map((x) => rules.split('{SEL}').join(x)).join('');
  return `@media (prefers-color-scheme:dark){${expand(auto)}}\n${expand(forced)}`;
}

/**
 * CSS que troca as cores do tema no modo escuro.
 * scope '.wb-site' (app e HTML exportado) ou ':root' (WordPress).
 * O visitante escolhe pelo botão (atributo data-wb-scheme no <html>) ou segue o sistema.
 */
export function darkSchemeCss(site: Site, scope: '.wb-site' | ':root' = '.wb-site', extraNames: (key: string) => string[] = () => []): string {
  const mode = site.settings.darkMode ?? 'off';
  if (mode === 'off') return '';
  const c = darkColors(site.theme);
  const vars =
    THEME_COLOR_KEYS.map(({ key }) =>
      [`--wb-${key}`, ...extraNames(key)].map((n) => `${n}:${c[key]} !important;`).join(''),
    ).join('') + 'color-scheme:dark;';
  const { auto, forced } = darkSelectors(scope);
  const icons = (sel: string) =>
    sel
      .split(',')
      .map((x) => `${x} .wb-sun{display:none}${x} .wb-moon{display:block}`)
      .join('');
  return `@media (prefers-color-scheme:dark){${auto}{${vars}}${icons(auto)}}\n${forced}{${vars}}${icons(forced)}`;
}
