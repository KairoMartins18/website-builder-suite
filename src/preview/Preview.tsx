import { useEffect, useMemo, useRef, useState } from 'react';
import type { DeviceMode, Site } from '../types';
import { storage } from '../lib/storage';
import { navigate } from '../lib/router';
import { collectFonts } from '../lib/theme';
import { useFonts } from '../lib/fontLoader';
import { SiteRenderer } from '../render/SiteRenderer';
import type { RenderEnv } from '../render/ElementContent';
import { Icon } from '../components/Icon';
import { DeviceSwitch } from '../components/DeviceSwitch';
import { handleSiteClick } from '../render/baseCss';
import { alertDialog } from '../components/Dialogs';

export function Preview({ siteId, pageId }: { siteId: string; pageId?: string }) {
  const [site, setSite] = useState<Site | null | undefined>(undefined);
  const [device, setDevice] = useState<DeviceMode>('desktop');
  const [scheme, setScheme] = useState<'light' | 'dark'>(() => (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const scrollRef = useRef<HTMLDivElement>(null);
  useFonts(site ? collectFonts(site) : []);

  useEffect(() => {
    void storage.getSite(siteId).then((s) => setSite(s ?? null));
  }, [siteId]);

  const page = site ? site.pages.find((p) => p.id === pageId) ?? site.pages.find((p) => p.id === site.homePageId) ?? site.pages[0] : undefined;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    if (site && page) document.title = page.seo.title || `${page.name} | ${site.name}`;
    return () => {
      document.title = 'Website Builder Suite';
    };
  }, [page, site]);

  const env = useMemo<RenderEnv | null>(
    () => (site && page ? { site, pageId: page.id, mode: 'live', hrefForPage: (id) => `#/preview/${site.id}/${id}` } : null),
    [site, page],
  );

  if (site === undefined) return <div className="loading">Carregando…</div>;
  if (!site || !page || !env)
    return (
      <div className="empty-state">
        <h2>Site não encontrado</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Voltar
        </button>
      </div>
    );

  return (
    <div className="pv">
      <header className="pv-bar">
        <button className="btn btn-ghost-dark" onClick={() => navigate(`/editor/${site.id}`)}>
          <Icon name="back" size={16} /> Voltar ao editor
        </button>
        <div className="pv-title">
          {site.name} · <span>{page.name}</span>
        </div>
        <div className="pv-actions">
          {site.settings.darkMode && site.settings.darkMode !== 'off' && (
            <button className="icon-btn" title={scheme === 'dark' ? 'Ver no modo claro' : 'Ver no modo escuro'} onClick={() => setScheme(scheme === 'dark' ? 'light' : 'dark')}>
              <Icon name={scheme === 'dark' ? 'sun' : 'moon'} />
            </button>
          )}
          <DeviceSwitch value={device} onChange={setDevice} />
        </div>
      </header>
      <div className={`pv-stage pv-${device}`}>
        <div
          ref={scrollRef}
          className="pv-scroll"
          onClick={(e) => handleSiteClick(e.target, () => setScheme((s) => (s === 'dark' ? 'light' : 'dark')))}
          onSubmit={(e) => {
            e.preventDefault();
            void alertDialog('Formulário enviado!', 'Na pré-visualização o envio é apenas simulado.');
          }}
        >
          <SiteRenderer site={site} page={page} target={device} env={env} scheme={site.settings.darkMode && site.settings.darkMode !== 'off' ? scheme : 'light'} />
        </div>
      </div>
    </div>
  );
}
