import type { Section, Site, Theme } from '../types';
import { DEFAULT_THEME, newPage, newSite } from '../lib/siteOps';
import { footerPreset, headerPreset, SECTION_PRESETS } from './sections';
import { buildAurora, buildBruma, buildPortfolio, buildRestaurante, buildSaas } from './themes';

export interface SiteTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  build: (siteName: string) => Site;
}

const preset = (id: string): Section => SECTION_PRESETS.find((p) => p.id === id)!.build();

/** Monta um site a partir de páginas descritas por IDs de presets de seção. */
export function composeSite(
  siteName: string,
  templateId: string,
  theme: Theme,
  pages: { name: string; slug: string; sections: string[] }[],
): Site {
  const site = newSite(siteName, theme);
  site.templateId = templateId;
  site.pages = pages.map((p) => newPage(p.name, p.slug, p.sections.map(preset)));
  site.homePageId = site.pages[0].id;
  const contact = site.pages.find((p) => p.slug === 'contato');
  site.header = headerPreset(siteName, contact ? { kind: 'page', pageId: contact.id } : undefined);
  site.footer = footerPreset(siteName);
  // Botões de chamada apontam para a página de contato, quando existir.
  if (contact) {
    for (const page of site.pages)
      for (const s of page.sections)
        for (const el of s.elements) if (el.type === 'button' && !el.link) el.link = { kind: 'page', pageId: contact.id };
  }
  return site;
}

export const TEMPLATES: SiteTemplate[] = [
  {
    id: 'blank',
    name: 'Em branco',
    category: 'Básico',
    description: 'Comece do zero com uma página vazia.',
    build: (name) => ({ ...newSite(name), templateId: 'blank' }),
  },
  {
    id: 'starter',
    name: 'Site institucional',
    category: 'Básico',
    description: 'Início, Sobre, Serviços e Contato prontos para personalizar.',
    build: (name) =>
      composeSite(name, 'starter', DEFAULT_THEME, [
        { name: 'Início', slug: 'inicio', sections: ['hero-center', 'about', 'services', 'testimonial', 'cta'] },
        { name: 'Sobre', slug: 'sobre', sections: ['hero-image', 'stats', 'gallery'] },
        { name: 'Serviços', slug: 'servicos', sections: ['services', 'pricing', 'cta'] },
        { name: 'Contato', slug: 'contato', sections: ['contact', 'map'] },
      ]),
  },
  { id: 'aurora', name: 'Aurora (glassmorfismo)', category: 'Glassmorfismo', description: 'Vidro fosco sobre degradês noturnos. Ideal para estúdios e produtos digitais.', build: buildAurora },
  { id: 'bruma', name: 'Bruma (glassmorfismo claro)', category: 'Glassmorfismo', description: 'Vidro leve em tons pastel. Para spas, clínicas e bem-estar.', build: buildBruma },
  { id: 'restaurante', name: 'Restaurante', category: 'Negócios', description: 'Cardápio, galeria de pratos e reservas com mapa.', build: buildRestaurante },
  { id: 'portfolio', name: 'Portfólio minimalista', category: 'Pessoal', description: 'Tipografia forte e grade de projetos. Para designers e criativos.', build: buildPortfolio },
  { id: 'saas', name: 'Startup / SaaS', category: 'Negócios', description: 'Destaque do produto, recursos, planos e contato.', build: buildSaas },
];
