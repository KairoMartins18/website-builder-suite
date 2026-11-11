import { useEffect, useMemo, useRef, useState } from 'react';
import type { Site, SiteMeta } from '../types';
import { storage } from '../lib/storage';
import { navigate } from '../lib/router';
import { reidentifySite } from '../lib/siteOps';
import { TEMPLATES, type SiteTemplate } from '../templates';
import { SiteThumbnail } from '../components/SiteThumbnail';
import { Icon } from '../components/Icon';
import { alertDialog, confirmDialog, promptDialog } from '../components/Dialogs';
import { downloadBackup, exportSite } from '../lib/exportActions';

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return 'agora mesmo';
  const m = Math.round(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} dia${d > 1 ? 's' : ''}`;
  return new Date(ts).toLocaleDateString('pt-BR');
}

export function Dashboard() {
  const [sites, setSites] = useState<SiteMeta[] | null>(null);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const importRef = useRef<HTMLInputElement>(null);

  const reload = () => storage.listSites().then(setSites);
  useEffect(() => {
    void reload();
  }, []);

  const filtered = (sites ?? []).filter((s) => s.name.toLowerCase().includes(query.toLowerCase()));

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as Site;
      if (!data?.pages?.length || !data.header || !data.footer) throw new Error('formato inválido');
      const site = reidentifySite(data);
      site.createdAt = site.updatedAt = Date.now();
      await storage.saveSite(site);
      await reload();
    } catch {
      void alertDialog('Não foi possível importar', 'O arquivo não é um backup válido do Website Builder Suite.');
    }
  };

  return (
    <div className="dash">
      <header className="dash-top">
        <div className="brand">
          <span className="brand-mark">W</span> Website Builder Suite
        </div>
        <div className="dash-top-actions">
          <button className="btn btn-ghost" onClick={() => importRef.current?.click()}>
            Importar backup
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importBackup(f);
              e.target.value = '';
            }}
          />
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> Criar novo site
          </button>
        </div>
      </header>

      <main className="dash-main">
        <div className="dash-head">
          <div>
            <h1>Meus sites</h1>
            <p>{sites ? `${sites.length} site${sites.length === 1 ? '' : 's'}` : 'Carregando…'}</p>
          </div>
          {!!sites?.length && <input className="input dash-search" placeholder="Buscar sites…" value={query} onChange={(e) => setQuery(e.target.value)} />}
        </div>

        {sites && sites.length === 0 && (
          <div className="dash-empty">
            <div className="dash-empty-art">
              <Icon name="desktop" size={48} />
            </div>
            <h2>Crie seu primeiro site</h2>
            <p>Escolha um modelo ou comece do zero. Você pode personalizar tudo depois.</p>
            <button className="btn btn-primary btn-lg" onClick={() => setCreating(true)}>
              <Icon name="plus" size={18} /> Criar novo site
            </button>
          </div>
        )}

        <div className="site-grid">
          {filtered.map((meta) => (
            <SiteCard key={meta.id} meta={meta} onChanged={reload} />
          ))}
        </div>
      </main>

      {creating && <CreateSiteDialog onClose={() => setCreating(false)} />}
    </div>
  );
}

function SiteCard({ meta, onChanged }: { meta: SiteMeta; onChanged: () => void }) {
  const [site, setSite] = useState<Site | null>(null);
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    void storage.getSite(meta.id).then((s) => setSite(s ?? null));
  }, [meta.id, meta.updatedAt]);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(false);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [menu]);

  const act = async (fn: () => Promise<unknown>) => {
    setMenu(false);
    await fn();
    onChanged();
  };

  return (
    <article className="site-card">
      <div
        className="site-card-thumb"
        role="button"
        tabIndex={0}
        onClick={() => navigate(`/editor/${meta.id}`)}
        onKeyDown={(e) => e.key === 'Enter' && navigate(`/editor/${meta.id}`)}
        title="Abrir no editor"
      >
        {site ? <SiteThumbnail site={site} /> : <div className="thumb" />}
        <span className="site-card-open">Editar site</span>
      </div>
      <div className="site-card-info">
        <div>
          <h3>{meta.name}</h3>
          <p>
            {site ? `${site.pages.length} página${site.pages.length === 1 ? '' : 's'} · ` : ''}Editado {timeAgo(meta.updatedAt)}
          </p>
        </div>
        <div className="menu-wrap">
          <button
            className="icon-btn"
            title="Mais ações"
            onClick={(e) => {
              e.stopPropagation();
              setMenu(!menu);
            }}
          >
            <Icon name="more" />
          </button>
          {menu && site && (
            <div className="menu" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => navigate(`/editor/${meta.id}`)}>
                <Icon name="edit" size={15} /> Editar
              </button>
              <button onClick={() => navigate(`/preview/${meta.id}`)}>
                <Icon name="play" size={15} /> Visualizar
              </button>
              <button
                onClick={() =>
                  act(async () => {
                    const name = await promptDialog({ title: 'Renomear site', defaultValue: meta.name, confirmLabel: 'Renomear' });
                    if (name?.trim()) await storage.saveSite({ ...site, name: name.trim(), updatedAt: Date.now() });
                  })
                }
              >
                <Icon name="edit" size={15} /> Renomear
              </button>
              <button
                onClick={() =>
                  act(async () => {
                    const copy = reidentifySite(site);
                    copy.name = `${site.name} (cópia)`;
                    copy.createdAt = copy.updatedAt = Date.now();
                    await storage.saveSite(copy);
                  })
                }
              >
                <Icon name="copy" size={15} /> Duplicar
              </button>
              <button onClick={() => act(async () => {
                    await exportSite(site);
                  })}>
                <Icon name="download" size={15} /> {window.wbNative ? 'Exportar site (HTML)' : 'Exportar HTML (.zip)'}
              </button>
              <button
                onClick={() =>
                  act(async () => downloadBackup(site))
                }
              >
                <Icon name="download" size={15} /> Baixar backup (.json)
              </button>
              <hr />
              <button
                className="danger"
                onClick={() =>
                  act(async () => {
                    if (await confirmDialog({ title: 'Excluir site', message: `Excluir o site "${meta.name}"? ${window.wbNative ? 'O arquivo vai para a lixeira.' : 'Esta ação não pode ser desfeita.'}`, confirmLabel: 'Excluir', danger: true }))
                      await storage.deleteSite(meta.id);
                  })
                }
              >
                <Icon name="trash" size={15} /> Excluir
              </button>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CreateSiteDialog({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('Meu site');
  const [templateId, setTemplateId] = useState(TEMPLATES[1]?.id ?? TEMPLATES[0].id);
  const [busy, setBusy] = useState(false);
  // Prévia dos templates com o nome digitado.
  const previews = useMemo(() => new Map(TEMPLATES.map((t) => [t.id, t.build('Minha Marca')])), []);

  const create = async () => {
    const tpl = TEMPLATES.find((t) => t.id === templateId) as SiteTemplate;
    setBusy(true);
    const site = tpl.build(name.trim() || 'Meu site');
    await storage.saveSite(site);
    navigate(`/editor/${site.id}`);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Criar novo site</h2>
          <button className="icon-btn" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          <label className="field">
            <span className="field-label">Nome do site</span>
            <input className="input input-lg" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} />
          </label>
          <div className="field-label" style={{ marginTop: 18 }}>
            Escolha um ponto de partida
          </div>
          <div className="tpl-grid">
            {TEMPLATES.map((t) => (
              <div
                key={t.id}
                role="button"
                tabIndex={0}
                aria-pressed={t.id === templateId}
                className={`tpl-card${t.id === templateId ? ' is-active' : ''}`}
                onClick={() => setTemplateId(t.id)}
                onDoubleClick={create}
                onKeyDown={(e) => e.key === 'Enter' && setTemplateId(t.id)}
              >
                <SiteThumbnail site={previews.get(t.id)!} />
                <div className="tpl-card-info">
                  <strong>{t.name}</strong>
                  <span>{t.description}</span>
                </div>
                {t.id === templateId && (
                  <span className="tpl-check">
                    <Icon name="check" size={14} />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="modal-foot">
          <button className="btn btn-ghost" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" disabled={busy} onClick={create}>
            Criar e abrir o editor
          </button>
        </div>
      </div>
    </div>
  );
}
