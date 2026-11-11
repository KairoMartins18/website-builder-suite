import { DESKTOP_WIDTH, MOBILE_WIDTH, type DeviceMode, type Geometry, type Page, type Section, type Site, type SiteElement } from '../types';

export const contentWidth = (device: DeviceMode) => (device === 'desktop' ? DESKTOP_WIDTH : MOBILE_WIDTH);

/** Cabeçalho + seções da página + rodapé, na ordem de exibição. */
export function pageSections(site: Site, page: Page): Section[] {
  return [site.header, ...page.sections, site.footer];
}

export interface MobileLayout {
  geoms: Record<string, Geometry>;
  height: number;
}

const PAD = 20;
const GAP = 16;
const TEXTUAL = new Set(['heading', 'text', 'menu', 'social']);
const CONTAINERS = new Set(['shape', 'image']);

const area = (e: Geometry) => e.w * e.h;
/** Tamanho do botão "hambúrguer" que substitui o menu no celular. */
export const BURGER = 40;

function contains(a: Geometry, b: Geometry) {
  return b.x >= a.x - 2 && b.y >= a.y - 2 && b.x + b.w <= a.x + a.w + 2 && b.y + b.h <= a.y + a.h + 2;
}

/**
 * Agrupa elementos em linhas visuais (que se sobrepõem verticalmente) e ordena
 * cada linha da esquerda para a direita — a ordem natural de leitura.
 */
function rowsOf(els: SiteElement[]): SiteElement[][] {
  const sorted = [...els].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: SiteElement[][] = [];
  let first: SiteElement | null = null;
  for (const el of sorted) {
    if (first && el.y < first.y + first.h * 0.6) rows[rows.length - 1].push(el);
    else {
      rows.push([el]);
      first = el;
    }
  }
  return rows.map((r) => r.sort((a, b) => a.x - b.x));
}

/** Tamanho de um elemento ao caber em `maxW` pixels de largura. */
function fit(el: SiteElement, maxW: number): { w: number; h: number } {
  if (el.type === 'menu') return { w: BURGER, h: BURGER };
  if (el.w <= maxW) return { w: el.w, h: el.h };
  const ratio = el.w / maxW;
  if (TEXTUAL.has(el.type)) return { w: maxW, h: Math.round(el.h * Math.min(ratio, 4)) };
  if (el.type === 'button' || el.type === 'line') return { w: maxW, h: el.h };
  if (el.type === 'form') return { w: maxW, h: el.h };
  return { w: maxW, h: Math.round(el.h / ratio) };
}

function stack(els: SiteElement[], startY: number, areaX: number, areaW: number, out: Record<string, Geometry>): number {
  let cursor = startY;
  for (const el of rowsOf(els).flat()) {
    const { w, h } = fit(el, areaW);
    out[el.id] = { x: areaX + Math.round((areaW - w) / 2), y: cursor, w, h };
    cursor += h + GAP;
  }
  return els.length ? cursor - GAP : startY;
}

function autoLayout(section: Section): MobileLayout {
  const geoms: Record<string, Geometry> = {};
  const els = section.elements.filter((e) => !e.mobileHidden);
  for (const e of section.elements) if (e.mobileHidden) geoms[e.id] = { x: PAD, y: 0, w: Math.min(e.w, MOBILE_WIDTH - 2 * PAD), h: e.h };

  if (!els.length) return { geoms, height: Math.max(60, Math.round(section.height * 0.6)) };

  // Agrupa elementos contidos em "containers" (formas/imagens maiores) para manter cartões juntos.
  const parent = new Map<string, SiteElement>();
  for (const el of els) {
    let best: SiteElement | undefined;
    for (const c of els) {
      if (c === el || !CONTAINERS.has(c.type) || area(c) <= area(el) || !contains(c, el)) continue;
      if (!best || area(c) > area(best)) best = c;
    }
    if (best) parent.set(el.id, best);
  }
  const roots = els.filter((e) => !parent.has(e.id));
  const children = (root: SiteElement) => els.filter((e) => parent.get(e.id) === root);
  const rows = rowsOf(roots);

  const innerW = MOBILE_WIDTH - 2 * PAD;
  let cursor = Math.min(Math.max(rows[0][0].y, 16), 40);
  for (const row of rows) {
    const rowStart = cursor;
    // Menus viram botões "hambúrguer" alinhados à direita na mesma linha.
    const menus = row.filter((e) => e.type === 'menu');
    menus.forEach((m, i) => {
      geoms[m.id] = { x: MOBILE_WIDTH - PAD - BURGER - i * (BURGER + 8), y: rowStart, w: BURGER, h: BURGER };
    });
    const reserved = menus.length * (BURGER + 12);

    row
      .filter((e) => e.type !== 'menu')
      .forEach((root, i) => {
        const besideMenu = i === 0 && reserved > 0;
        const areaW = besideMenu ? innerW - reserved : innerW;
        const fullBleed = !besideMenu && root.w >= DESKTOP_WIDTH - 20 && !TEXTUAL.has(root.type);
        const size = fullBleed ? { w: MOBILE_WIDTH, h: Math.round(root.h * (MOBILE_WIDTH / root.w)) } : fit(root, areaW);
        const x = fullBleed ? 0 : besideMenu ? PAD : PAD + Math.round((innerW - size.w) / 2);
        // Elemento ao lado do menu: centraliza verticalmente com o botão.
        const y = besideMenu ? rowStart + Math.round((BURGER - Math.min(size.h, BURGER)) / 2) : cursor;
        const kids = children(root);
        let h = size.h;
        if (kids.length) {
          const innerPad = fullBleed ? PAD : 16;
          const end = stack(kids, y + 20, x + innerPad, size.w - innerPad * 2, geoms);
          h = Math.max(h, end - y + 20);
        }
        geoms[root.id] = { x, y, w: size.w, h };
        cursor = y + h + GAP;
      });
    if (menus.length) cursor = Math.max(cursor, rowStart + BURGER + GAP);
  }
  return { geoms, height: Math.max(cursor - GAP + PAD, 40) };
}

function frozenLayout(section: Section): MobileLayout {
  const geoms: Record<string, Geometry> = {};
  const pending: SiteElement[] = [];
  let bottom = 0;
  for (const el of section.elements) {
    if (el.mobile) {
      geoms[el.id] = el.mobile;
      if (!el.mobileHidden) bottom = Math.max(bottom, el.mobile.y + el.mobile.h);
    } else pending.push(el);
  }
  let height = section.mobileHeight ?? bottom + PAD;
  if (pending.length) {
    const end = stack(pending, bottom + GAP, PAD, MOBILE_WIDTH - 2 * PAD, geoms);
    height = Math.max(height, end + PAD);
  }
  return { geoms, height };
}

const cache = new WeakMap<Section, MobileLayout>();

/** Layout mobile da seção: automático (empilhado) ou congelado (ajustado à mão). */
export function mobileLayout(section: Section): MobileLayout {
  let res = cache.get(section);
  if (!res) {
    res = section.mobileFrozen ? frozenLayout(section) : autoLayout(section);
    cache.set(section, res);
  }
  return res;
}

export function elementGeom(section: Section, el: SiteElement, device: DeviceMode): Geometry {
  if (device === 'desktop') return el;
  return mobileLayout(section).geoms[el.id] ?? el;
}

export function sectionHeight(section: Section, device: DeviceMode): number {
  return device === 'desktop' ? section.height : mobileLayout(section).height;
}
