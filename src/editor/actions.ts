import type { Geometry, Page, Section, Site, SiteElement, WidgetNode } from '../types';
import { useEditor } from '../store/editor';
import { cloneElement, cloneSection, findElement, findSection, newPage, pageOfSection, uniqueSlug } from '../lib/siteOps';
import { contentWidth, mobileLayout, pageSections } from '../lib/layout';
import { makeElement, type ElementSeed } from '../elements/registry';
import { uid } from '../lib/id';
import { blankFlowSection, cloneNode, findNode, isFlow } from '../lib/flow';
import { addWidget, elementFromWidget, insertNode, insertionPoint, widgetFromElement } from './flowActions';

const st = () => useEditor.getState();
const round = (g: Partial<Geometry>) => Object.fromEntries(Object.entries(g).map(([k, v]) => [k, Math.round(v as number)])) as Partial<Geometry>;

export function currentPage(): Page | undefined {
  const { site, pageId } = st();
  return site?.pages.find((p) => p.id === pageId);
}

/** Seção da seleção atual, ou a seção visível no centro do canvas. */
export function targetSectionId(): string | undefined {
  const { site, selection } = st();
  if (!site) return;
  if (selection?.kind === 'section') return selection.id;
  if (selection?.kind === 'element') return findElement(site, selection.id)?.section.id;
  if (selection?.kind === 'node') return findNode(site, selection.id)?.section.id;
  const scroller = document.querySelector('.ed-canvas-scroll');
  if (scroller) {
    const r = scroller.getBoundingClientRect();
    const midY = r.top + r.height / 2;
    for (const node of document.querySelectorAll<HTMLElement>('[data-section-id]')) {
      const sr = node.getBoundingClientRect();
      if (midY >= sr.top && midY <= sr.bottom) return node.dataset.sectionId;
    }
  }
  return currentPage()?.sections[0]?.id ?? site.header.id;
}

// ---------- layout mobile ----------

/** Congela o layout mobile automático da seção para permitir ajustes manuais. */
export function freezeMobile(sectionId: string) {
  const site = st().site;
  const sec = site && findSection(site, sectionId);
  if (!sec || (sec.mobileFrozen && sec.elements.every((e) => e.mobile))) return;
  const ml = mobileLayout(sec);
  st().mutate(
    (d) => {
      const s = findSection(d, sectionId)!;
      s.mobileFrozen = true;
      s.mobileHeight = ml.height;
      for (const e of s.elements) e.mobile = { ...ml.geoms[e.id] };
    },
    { history: false },
  );
}

export function resetMobileLayout(sectionId: string) {
  st().mutate((d) => {
    const s = findSection(d, sectionId);
    if (!s) return;
    delete s.mobileFrozen;
    delete s.mobileHeight;
    for (const e of s.elements) delete e.mobile;
  });
}

// ---------- elementos ----------

export function setGeom(id: string, patch: Partial<Geometry>, opts: { history?: boolean; key?: string } = { history: false }) {
  const { site, device } = st();
  // Seções livres não são editáveis no tablet (o layout é o de computador reduzido).
  if (!site || device === 'tablet') return;
  const found = findElement(site, id);
  if (!found) return;
  if (device === 'mobile' && !found.element.mobile) freezeMobile(found.section.id);
  const p = round(patch);
  st().mutate((d) => {
    const f = findElement(d, id);
    if (!f) return;
    if (device === 'desktop') {
      Object.assign(f.element, p);
      if (f.element.y + f.element.h > f.section.height && p.h !== undefined && p.y === undefined) {
        // texto que cresceu: estende a seção
        f.section.height = f.element.y + f.element.h + 20;
      }
    } else {
      f.element.mobile = { ...f.element.mobile!, ...p };
    }
  }, opts);
}

export function updateElement(id: string, recipe: (el: SiteElement) => void, key?: string) {
  st().mutate(
    (d) => {
      const f = findElement(d, id);
      if (f) recipe(f.element);
    },
    { key: key ? `${id}:${key}` : undefined },
  );
}

export function addElement(seed: ElementSeed, target?: { sectionId?: string; x?: number; y?: number }) {
  const { site, device } = st();
  if (!site) return;
  const sectionId = target?.sectionId ?? targetSectionId();
  const sec = sectionId ? findSection(site, sectionId) : undefined;
  if (!sec) return;
  // Seção com containers: vira widget no container selecionado.
  if (isFlow(sec)) {
    addWidget(seed, target ? { containerId: sec.root.id, index: sec.root.children.length } : insertionPoint());
    return;
  }
  if (device === 'tablet') st().setDevice('desktop');
  const el = makeElement(seed);
  const cw = contentWidth(device);

  if (device !== 'mobile') {
    el.x = Math.round(target?.x ?? (cw - el.w) / 2);
    el.y = Math.round(target?.y ?? Math.max(20, (sec.height - el.h) / 2));
  } else {
    // No celular: posição desktop padrão + geometria mobile no ponto escolhido.
    freezeMobile(sec.id);
    el.x = Math.round((contentWidth('desktop') - el.w) / 2);
    el.y = Math.round(Math.max(20, (sec.height - el.h) / 2));
    const w = Math.min(el.w, cw - 40);
    const h = el.type === 'button' || el.type === 'text' || el.type === 'heading' ? el.h : Math.round(el.h * (w / el.w));
    const mh = mobileLayout(findSection(st().site!, sec.id)!).height;
    el.mobile = { x: Math.round(target?.x ?? (cw - w) / 2), y: Math.round(target?.y ?? Math.max(20, (mh - h) / 2)), w, h };
  }
  el.x = Math.max(-el.w + 20, el.x);
  el.y = Math.max(0, el.y);

  st().mutate((d) => {
    const s = findSection(d, sec.id)!;
    s.elements.push(el);
    if (el.y + el.h > s.height) s.height = el.y + el.h + 40;
    if (el.mobile && s.mobileHeight !== undefined && el.mobile.y + el.mobile.h > s.mobileHeight) s.mobileHeight = el.mobile.y + el.mobile.h + 20;
  });
  st().select({ kind: 'element', id: el.id });
}

export function deleteElement(id: string) {
  st().mutate((d) => {
    const f = findElement(d, id);
    if (f) f.section.elements.splice(f.index, 1);
  });
  st().select(null);
}

export function duplicateElement(id: string) {
  const site = st().site;
  const f = site && findElement(site, id);
  if (!f) return;
  const copy = cloneElement(f.element);
  copy.x += 20;
  copy.y += 20;
  if (copy.mobile) copy.mobile = { ...copy.mobile, x: copy.mobile.x + 10, y: copy.mobile.y + 20 };
  st().mutate((d) => {
    findElement(d, id)!.section.elements.splice(f.index + 1, 0, copy);
  });
  st().select({ kind: 'element', id: copy.id });
}

export function copyElement(id: string) {
  const site = st().site;
  const f = site && findElement(site, id);
  if (f) st().setClipboard({ kind: 'element', element: structuredClone(f.element) });
}

export function pasteElement() {
  const { clipboard, site } = st();
  if (!clipboard || !site) return;
  const sectionId = targetSectionId();
  const target = sectionId ? findSection(site, sectionId) : undefined;
  if (!target) return;
  if (isFlow(target)) {
    insertNode(clipboard.kind === 'node' ? cloneNode(clipboard.node) : widgetFromElement(clipboard.element));
    return;
  }
  if (clipboard.kind === 'node' && clipboard.node.kind === 'container') return; // containers só em seções com containers
  const copy = clipboard.kind === 'node' ? elementFromWidget(clipboard.node as WidgetNode) : cloneElement(clipboard.element);
  copy.x += 20;
  copy.y += 20;
  delete copy.mobile;
  st().mutate((d) => {
    const s = findSection(d, target.id)!;
    copy.y = Math.min(copy.y, Math.max(0, s.height - copy.h));
    s.elements.push(copy);
  });
  st().select({ kind: 'element', id: copy.id });
}

export type Arrange = 'front' | 'forward' | 'backward' | 'back';
export function arrangeElement(id: string, how: Arrange) {
  st().mutate((d) => {
    const f = findElement(d, id);
    if (!f) return;
    const list = f.section.elements;
    const [el] = list.splice(f.index, 1);
    const to = how === 'front' ? list.length : how === 'back' ? 0 : how === 'forward' ? Math.min(list.length, f.index + 1) : Math.max(0, f.index - 1);
    list.splice(to, 0, el);
  });
}

/** Move um elemento para outra seção (ao arrastá-lo para fora da seção atual). */
export function moveElementToSection(id: string, toSectionId: string, x: number, y: number) {
  st().mutate(
    (d) => {
      const f = findElement(d, id);
      const to = findSection(d, toSectionId);
      if (!f || !to || f.section.id === toSectionId) return;
      const [el] = f.section.elements.splice(f.index, 1);
      el.x = Math.round(x);
      el.y = Math.round(Math.max(0, y));
      delete el.mobile;
      to.elements.push(el);
      if (el.y + el.h > to.height) to.height = el.y + el.h + 20;
    },
    { history: false },
  );
}

// ---------- seções ----------

export function updateSection(id: string, recipe: (s: Section) => void, key?: string) {
  st().mutate(
    (d) => {
      const s = findSection(d, id);
      if (s) recipe(s);
    },
    { key: key ? `${id}:${key}` : undefined },
  );
}

/** Insere uma seção na página atual, depois de `afterId` (ou no fim). */
export function insertSection(section: Section, afterId?: string) {
  const page = currentPage();
  if (!page) return;
  st().mutate((d) => {
    const p = d.pages.find((x) => x.id === page.id)!;
    const idx = afterId ? p.sections.findIndex((s) => s.id === afterId) : -1;
    if (idx >= 0) p.sections.splice(idx + 1, 0, section);
    else if (afterId === st().site?.header.id) p.sections.unshift(section);
    else p.sections.push(section);
  });
  st().select({ kind: 'section', id: section.id });
  requestAnimationFrame(() => document.querySelector(`[data-section-id="${section.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
}

export function addBlankSection(afterId?: string) {
  const page = currentPage();
  insertSection(blankFlowSection(`Seção ${(page?.sections.length ?? 0) + 1}`), afterId);
}

export function moveSection(id: string, dir: -1 | 1) {
  st().mutate((d) => {
    const page = pageOfSection(d, id);
    if (!page) return;
    const i = page.sections.findIndex((s) => s.id === id);
    const j = i + dir;
    if (j < 0 || j >= page.sections.length) return;
    [page.sections[i], page.sections[j]] = [page.sections[j], page.sections[i]];
  });
}

export function duplicateSection(id: string) {
  const site = st().site;
  const sec = site && findSection(site, id);
  if (!sec || sec.kind !== 'body') return;
  insertSection({ ...cloneSection(sec), name: `${sec.name} (cópia)` }, id);
}

export function deleteSection(id: string) {
  st().mutate((d) => {
    const page = pageOfSection(d, id);
    if (page) page.sections = page.sections.filter((s) => s.id !== id);
  });
  st().select(null);
}

// ---------- páginas ----------

export function addPage(name: string, sections?: Section[], role?: Page['role']) {
  const site = st().site;
  if (!site) return;
  const page = newPage(name, uniqueSlug(site, name), sections ?? [blankFlowSection('Seção 1')]);
  if (role && role !== 'page') page.role = role;
  if (role === 'post') page.hideFromMenu = true;
  st().mutate((d) => {
    d.pages.push(page);
  });
  st().setPage(page.id);
}

export function duplicatePage(id: string) {
  const site = st().site;
  const page = site?.pages.find((p) => p.id === id);
  if (!site || !page) return;
  const name = `${page.name} (cópia)`;
  const copy: Page = { ...structuredClone(page), id: uid('p'), name, slug: uniqueSlug(site, name), sections: page.sections.map(cloneSection) };
  st().mutate((d) => {
    d.pages.splice(d.pages.findIndex((p) => p.id === id) + 1, 0, copy);
  });
  st().setPage(copy.id);
}

export function deletePage(id: string) {
  const site = st().site;
  if (!site || site.pages.length <= 1) return;
  st().mutate((d) => {
    d.pages = d.pages.filter((p) => p.id !== id);
    if (d.homePageId === id) d.homePageId = d.pages[0].id;
  });
  if (st().pageId === id) st().setPage(st().site!.homePageId);
}

export function updatePage(id: string, recipe: (p: Page) => void, key?: string) {
  st().mutate(
    (d) => {
      const p = d.pages.find((x) => x.id === id);
      if (p) recipe(p);
    },
    { key: key ? `${id}:${key}` : undefined },
  );
}

export function updateSite(recipe: (s: Site) => void, key?: string) {
  st().mutate(recipe, { key });
}

export function visibleSections(): Section[] {
  const { site } = st();
  const page = currentPage();
  return site && page ? pageSections(site, page) : [];
}
