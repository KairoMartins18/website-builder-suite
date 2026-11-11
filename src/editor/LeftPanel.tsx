import { useState } from 'react';
import type { Section, Site, ThemeColors } from '../types';
import { useEditor, type LeftPanel as PanelId } from '../store/editor';
import { ADD_CATEGORIES, ELEMENTS } from '../elements/registry';
import { SECTION_PRESETS } from '../templates/sections';
import { FONTS } from '../lib/fonts';
import { PALETTES, THEME_COLOR_KEYS } from '../lib/theme';
import { findElement } from '../lib/siteOps';
import { pageSections } from '../lib/layout';
import { Icon } from '../components/Icon';
import { ColorInput, Field, FontSelect } from '../components/fields';
import { ADD_MIME } from './Canvas';
import { addElement, addPage, duplicatePage, insertSection, targetSectionId, updateElement, updatePage, updateSite } from './actions';
import { confirmDeletePage } from './confirmations';
import { promptDialog } from '../components/Dialogs';

const PANELS: { id: PanelId; label: string; icon: string }[] = [
  { id: 'add', label: 'Adicionar', icon: 'add' },
  { id: 'sections', label: 'Seções', icon: 'sections' },
  { id: 'pages', label: 'Páginas', icon: 'pages' },
  { id: 'layers', label: 'Camadas', icon: 'layers' },
  { id: 'theme', label: 'Tema', icon: 'theme' },
];

export function LeftRail() {
  const panel = useEditor((s) => s.leftPanel);
  const setPanel = useEditor((s) => s.setLeftPanel);
  return (
    <nav className="ed-rail">
      {PANELS.map((p) => (
        <button key={p.id} className={panel === p.id ? 'is-active' : ''} onClick={() => setPanel(panel === p.id ? null : p.id)} title={p.label}>
          <Icon name={p.icon} size={20} />
          <span>{p.label}</span>
        </button>
      ))}
    </nav>
  );
}

export function LeftDrawer() {
  const panel = useEditor((s) => s.leftPanel);
  const setPanel = useEditor((s) => s.setLeftPanel);
  const site = useEditor((s) => s.site)!;
  if (!panel) return null;
  const title = PANELS.find((p) => p.id === panel)!.label;
  return (
    <div className="ed-drawer">
      <div className="ed-drawer-head">
        <span>{title}</span>
        <button className="icon-btn" onClick={() => setPanel(null)} title="Fechar">
          <Icon name="close" size={16} />
        </button>
      </div>
      <div className="ed-drawer-body">
        {panel === 'add' && <AddPanel />}
        {panel === 'sections' && <SectionsPanel />}
        {panel === 'pages' && <PagesPanel site={site} />}
        {panel === 'layers' && <LayersPanel site={site} />}
        {panel === 'theme' && <ThemePanel site={site} />}
      </div>
    </div>
  );
}

function AddPanel() {
  return (
    <>
      <p className="hint">Clique para adicionar à seção selecionada ou arraste para o canvas.</p>
      {ADD_CATEGORIES.map((cat, ci) => (
        <div key={cat.name} className="add-cat">
          <div className="add-cat-title">{cat.name}</div>
          <div className="add-grid">
            {cat.items.map((item, ii) => (
              <button
                key={item.label}
                className="add-item"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData(ADD_MIME, `${ci}:${ii}`);
                  e.dataTransfer.effectAllowed = 'copy';
                }}
                onClick={() => addElement(item.seed())}
              >
                <span className="add-item-icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

function SectionsPanel() {
  return (
    <>
      <p className="hint">A nova seção será inserida abaixo da seção selecionada.</p>
      <div className="preset-list">
        {SECTION_PRESETS.map((p) => (
          <button
            key={p.id}
            className="preset-item"
            onClick={() => {
              const st = useEditor.getState();
              const after = targetSectionId();
              const sec = after ? pageSections(st.site!, st.site!.pages.find((x) => x.id === st.pageId)!).find((s) => s.id === after) : undefined;
              insertSection(p.build(), sec?.kind === 'footer' ? undefined : after);
            }}
          >
            <strong>{p.name}</strong>
            <span>{p.description}</span>
          </button>
        ))}
      </div>
    </>
  );
}

function PagesPanel({ site }: { site: Site }) {
  const pageId = useEditor((s) => s.pageId);
  const setPage = useEditor((s) => s.setPage);
  const [renaming, setRenaming] = useState<string | null>(null);
  return (
    <>
      <div className="page-list">
        {site.pages.map((p) => (
          <div key={p.id} className={`page-item${p.id === pageId ? ' is-active' : ''}`} onClick={() => setPage(p.id)}>
            {p.id === site.homePageId ? <Icon name="home" size={15} /> : <Icon name="pages" size={15} />}
            {renaming === p.id ? (
              <input
                className="input"
                autoFocus
                defaultValue={p.name}
                onClick={(e) => e.stopPropagation()}
                onBlur={(e) => {
                  const v = e.target.value.trim();
                  if (v) updatePage(p.id, (d) => void (d.name = v));
                  setRenaming(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setRenaming(null);
                }}
              />
            ) : (
              <span className="page-item-name" onDoubleClick={() => setRenaming(p.id)}>
                {p.name}
                {p.hideFromMenu && <em> (oculta)</em>}
              </span>
            )}
            <div className="page-item-actions" onClick={(e) => e.stopPropagation()}>
              <button className="icon-btn" title="Renomear" onClick={() => setRenaming(p.id)}>
                <Icon name="edit" size={14} />
              </button>
              <button className="icon-btn" title="Duplicar" onClick={() => duplicatePage(p.id)}>
                <Icon name="copy" size={14} />
              </button>
              {site.pages.length > 1 && (
                <button className="icon-btn" title="Excluir" onClick={() => void confirmDeletePage(p)}>
                  <Icon name="trash" size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <button
        className="btn btn-primary btn-block"
        onClick={() => {
          void promptDialog({ title: 'Nova página', defaultValue: 'Nova página', confirmLabel: 'Criar página' }).then((name) => name && addPage(name));
        }}
      >
        <Icon name="plus" size={16} /> Nova página
      </button>
      <p className="hint">Configurações de SEO e endereço ficam no painel à direita quando nada está selecionado.</p>
    </>
  );
}

function LayersPanel({ site }: { site: Site }) {
  const pageId = useEditor((s) => s.pageId);
  const selection = useEditor((s) => s.selection);
  const select = useEditor((s) => s.select);
  const page = site.pages.find((p) => p.id === pageId)!;
  const selectedSection =
    selection?.kind === 'section' ? selection.id : selection?.kind === 'element' ? findElement(site, selection.id)?.section.id : undefined;

  const reveal = (id: string, attr: 'data-el-id' | 'data-section-id') =>
    document.querySelector(`[${attr}="${id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const renderSection = (s: Section) => (
    <div key={s.id} className="layer-group">
      <div
        className={`layer-section${selection?.kind === 'section' && selection.id === s.id ? ' is-active' : ''}${selectedSection === s.id ? ' is-open' : ''}`}
        onClick={() => {
          select({ kind: 'section', id: s.id });
          reveal(s.id, 'data-section-id');
        }}
      >
        <Icon name="sections" size={14} />
        {s.kind === 'header' ? 'Cabeçalho' : s.kind === 'footer' ? 'Rodapé' : s.name}
        <span className="layer-count">{s.elements.length}</span>
      </div>
      {[...s.elements].reverse().map((el) => (
        <div
          key={el.id}
          className={`layer-el${selection?.kind === 'element' && selection.id === el.id ? ' is-active' : ''}`}
          onClick={() => {
            select({ kind: 'element', id: el.id });
            reveal(el.id, 'data-el-id');
          }}
        >
          <span className="layer-el-name">{el.name || layerLabel(el.type, el.props)}</span>
          <button
            className={`icon-btn${el.mobileHidden ? ' is-on' : ''}`}
            title={el.mobileHidden ? 'Oculto no celular' : 'Ocultar no celular'}
            onClick={(e) => {
              e.stopPropagation();
              updateElement(el.id, (d) => void (d.mobileHidden ? delete d.mobileHidden : (d.mobileHidden = true)));
            }}
          >
            <Icon name={el.mobileHidden ? 'eyeOff' : 'mobile'} size={13} />
          </button>
          <button
            className={`icon-btn${el.locked ? ' is-on' : ''}`}
            title={el.locked ? 'Desbloquear' : 'Bloquear'}
            onClick={(e) => {
              e.stopPropagation();
              updateElement(el.id, (d) => void (d.locked ? delete d.locked : (d.locked = true)));
            }}
          >
            <Icon name={el.locked ? 'lock' : 'unlock'} size={13} />
          </button>
        </div>
      ))}
    </div>
  );

  return <div className="layers">{pageSections(site, page).map(renderSection)}</div>;
}

function layerLabel(type: keyof typeof ELEMENTS, props: Record<string, unknown>): string {
  const base = ELEMENTS[type].label;
  const raw = (props.html as string | undefined) ?? (props.label as string | undefined);
  if (!raw) return base;
  const text = raw.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
  return text ? `${base}: ${text.slice(0, 28)}${text.length > 28 ? '…' : ''}` : base;
}

function ThemePanel({ site }: { site: Site }) {
  const theme = site.theme;
  const setColor = (key: keyof ThemeColors, v: string | undefined) => v && updateSite((d) => void (d.theme.colors[key] = v), `theme.${key}`);
  return (
    <>
      <p className="hint">Elementos que usam cores e fontes do tema são atualizados em todo o site.</p>
      <div className="add-cat-title">Paletas prontas</div>
      <div className="palettes">
        {PALETTES.map((p) => (
          <button key={p.name} className="palette" title={p.name} onClick={() => updateSite((d) => void (d.theme.colors = { ...p.colors }))}>
            {THEME_COLOR_KEYS.map(({ key }) => (
              <span key={key} style={{ background: p.colors[key] }} />
            ))}
            <em>{p.name}</em>
          </button>
        ))}
      </div>
      <div className="add-cat-title">Cores</div>
      {THEME_COLOR_KEYS.map(({ key, label }) => (
        <Field key={key} label={label}>
          <ColorInput value={theme.colors[key]} theme={theme} allowNone={false} onChange={(v) => setColor(key, v?.startsWith('theme:') ? theme.colors[v.slice(6) as keyof ThemeColors] : v)} />
        </Field>
      ))}
      <div className="add-cat-title">Fontes</div>
      <Field label="Títulos">
        <FontSelect value={theme.fonts.heading} theme={theme} allowTheme={false} onChange={(v) => updateSite((d) => void (d.theme.fonts.heading = v))} />
      </Field>
      <Field label="Corpo do texto">
        <FontSelect value={theme.fonts.body} theme={theme} allowTheme={false} onChange={(v) => updateSite((d) => void (d.theme.fonts.body = v))} />
      </Field>
      <div className="font-preview">
        <div style={{ fontFamily: `'${theme.fonts.heading}'` }}>Aa — Título de exemplo</div>
        <p style={{ fontFamily: `'${theme.fonts.body}'` }}>O texto do corpo aparece assim para os visitantes do seu site.</p>
      </div>
      <p className="hint">{FONTS.length} fontes do Google Fonts disponíveis.</p>
    </>
  );
}

