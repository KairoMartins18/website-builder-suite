import type { Page, Section, SectionKind, Site, SiteElement, Theme } from '../types';
import { uid } from './id';

export function slugify(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'pagina'
  );
}

export function uniqueSlug(site: Site, base: string, exceptPageId?: string): string {
  const taken = new Set(site.pages.filter((p) => p.id !== exceptPageId).map((p) => p.slug));
  taken.add('index');
  let slug = slugify(base);
  for (let i = 2; taken.has(slug); i++) slug = `${slugify(base)}-${i}`;
  return slug;
}

export function newSection(kind: SectionKind, name: string, height: number, partial: Partial<Section> = {}): Section {
  return { id: uid('s'), kind, name, height, background: {}, elements: [], ...partial };
}

export function newPage(name: string, slug: string, sections: Section[] = []): Page {
  return { id: uid('p'), name, slug, sections, seo: { title: '', description: '' } };
}

export const DEFAULT_THEME: Theme = {
  colors: { primary: '#116dff', secondary: '#0b1f44', accent: '#ffb020', text: '#1d2433', background: '#ffffff', muted: '#f2f5fa' },
  fonts: { heading: 'Poppins', body: 'Inter' },
};

export function newSite(name: string, theme: Theme = DEFAULT_THEME): Site {
  const home = newPage('Início', 'inicio', [newSection('body', 'Seção 1', 600)]);
  const now = Date.now();
  return {
    id: uid('site'),
    name,
    createdAt: now,
    updatedAt: now,
    theme: structuredClone(theme),
    header: newSection('header', 'Cabeçalho', 90),
    footer: newSection('footer', 'Rodapé', 120),
    pages: [home],
    homePageId: home.id,
    settings: { language: 'pt-BR' },
  };
}

export function allSections(site: Site): Section[] {
  return [site.header, site.footer, ...site.pages.flatMap((p) => p.sections)];
}

export function findSection(site: Site, sectionId: string): Section | undefined {
  return allSections(site).find((s) => s.id === sectionId);
}

export function findElement(site: Site, elementId: string): { section: Section; element: SiteElement; index: number } | undefined {
  for (const section of allSections(site)) {
    const index = section.elements.findIndex((e) => e.id === elementId);
    if (index >= 0) return { section, element: section.elements[index], index };
  }
  return undefined;
}

/** Página que contém a seção (cabeçalho/rodapé pertencem a todas). */
export function pageOfSection(site: Site, sectionId: string): Page | undefined {
  return site.pages.find((p) => p.sections.some((s) => s.id === sectionId));
}

export function cloneElement(el: SiteElement): SiteElement {
  return { ...structuredClone(el), id: uid('e') };
}

export function cloneSection(section: Section): Section {
  const copy = structuredClone(section);
  copy.id = uid('s');
  copy.elements = copy.elements.map((e) => ({ ...e, id: uid('e') }));
  return copy;
}

/** Gera novos IDs para um site inteiro (usado ao criar a partir de templates / duplicar). */
export function reidentifySite(site: Site): Site {
  const copy = structuredClone(site);
  const pageIds = new Map<string, string>();
  for (const p of copy.pages) {
    const id = uid('p');
    pageIds.set(p.id, id);
    p.id = id;
  }
  const fix = (s: Section) => {
    s.id = uid('s');
    for (const e of s.elements) {
      e.id = uid('e');
      if (e.link?.kind === 'page' && e.link.pageId) e.link.pageId = pageIds.get(e.link.pageId) ?? e.link.pageId;
    }
  };
  fix(copy.header);
  fix(copy.footer);
  copy.pages.forEach((p) => p.sections.forEach(fix));
  copy.homePageId = pageIds.get(copy.homePageId) ?? copy.pages[0].id;
  copy.id = uid('site');
  return copy;
}
