import type { CSSProperties } from 'react';
import type { ElementStyle, Site, SiteElement, Theme, ThemeColors } from '../types';
import { fontStack } from './fonts';

export const THEME_COLOR_KEYS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'primary', label: 'Principal' },
  { key: 'secondary', label: 'Secundária' },
  { key: 'accent', label: 'Destaque' },
  { key: 'text', label: 'Texto' },
  { key: 'background', label: 'Fundo' },
  { key: 'muted', label: 'Suave' },
];

export function resolveColor(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('theme:')) return `var(--wb-${value.slice(6)})`;
  return value;
}

/** Converte uma cor (inclusive do tema) para #hex, para o <input type=color>. */
export function colorToHex(value: string | undefined, theme: Theme): string {
  if (!value) return '#000000';
  if (value.startsWith('theme:')) value = theme.colors[value.slice(6) as keyof ThemeColors] ?? '#000000';
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

export function elementCss(el: SiteElement): CSSProperties {
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
