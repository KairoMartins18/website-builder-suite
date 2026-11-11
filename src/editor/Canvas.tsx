import { useMemo, type CSSProperties } from 'react';
import type React from 'react';
import { MOBILE_WIDTH, TABLET_WIDTH, type DeviceMode, type Section, type Site, type SiteElement } from '../types';
import { useEditor } from '../store/editor';
import { contentWidth, elementGeom, pageSections, sectionHeight } from '../lib/layout';
import { flowCss, isFlow } from '../lib/flow';
import { darkSchemeCss, darkSectionsCss, elementCss, resolveColor, themeVars } from '../lib/theme';
import { findElement } from '../lib/siteOps';
import { ElementContent, type RenderEnv } from '../render/ElementContent';
import { sectionBackground, TABLET_FREE_ZOOM } from '../render/SiteRenderer';
import { ADD_CATEGORIES, ELEMENTS } from '../elements/registry';
import { startMove, startResize, startSectionResize, type HandleDir } from './gestures';
import { addBlankSection, addElement, arrangeElement, deleteElement, duplicateElement, duplicateSection, moveSection, setGeom } from './actions';
import { Icon } from '../components/Icon';
import { confirmDeleteSection } from './confirmations';
import { InlineTextEditor, TextToolbar } from './InlineText';
import { ADD_MIME, FlowNodeEditor, FlowOverlay, flowDropHandlers, STRUCT_MIME } from './FlowEditor';
import { useDnd } from './flowDnd';

export { ADD_MIME, STRUCT_MIME };

const SITE_WIDTH: Record<DeviceMode, number | undefined> = { desktop: undefined, tablet: TABLET_WIDTH, mobile: MOBILE_WIDTH };

export function Canvas() {
  const site = useEditor((s) => s.site)!;
  const pageId = useEditor((s) => s.pageId);
  const device = useEditor((s) => s.device);
  const select = useEditor((s) => s.select);
  const page = site.pages.find((p) => p.id === pageId) ?? site.pages[0];
  const sections = pageSections(site, page);
  const env = useMemo<RenderEnv>(() => ({ site, pageId: page.id, mode: 'edit', hrefForPage: () => '#' }), [site, page.id]);
  const scheme = useEditor((s) => s.previewScheme);
  const css = useMemo(() => flowCss(sections, device, { editor: true }) + '\n' + darkSchemeCss(site) + '\n' + darkSectionsCss(site, sections), [sections, device, site]);

  return (
    <div
      className="ed-canvas-scroll"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('ed-stage')) select(null);
      }}
      onScroll={() => useDnd.getState().drop && useDnd.setState({ drop: null })}
    >
      <div className={`ed-stage ed-stage-${device}`}>
        <div className={`wb-site ed-site${device !== 'desktop' ? ` wb-${device}` : ''}`} style={{ ...themeVars(site.theme), width: SITE_WIDTH[device] }} data-wb-scheme={site.settings.darkMode && site.settings.darkMode !== 'off' ? scheme : 'light'}>
          <style dangerouslySetInnerHTML={{ __html: css }} />
          {sections.map((s) =>
            isFlow(s) ? <EditorFlowSection key={s.id} section={s} device={device} env={env} site={site} /> : <EditorSection key={s.id} section={s} device={device} env={env} site={site} />,
          )}
        </div>
      </div>
      <FlowOverlay />
    </div>
  );
}

/** Rótulo, ferramentas da seção e botão "+ Adicionar seção" (comuns aos dois modos). */
function SectionChrome({ section, site, pageId, device }: { section: Section; site: Site; pageId: string; device: DeviceMode }) {
  const selected = useEditor((s) => s.selection?.kind === 'section' && s.selection.id === section.id);
  const select = useEditor((s) => s.select);
  const page = site.pages.find((p) => p.id === pageId)!;
  const index = page.sections.findIndex((s) => s.id === section.id);
  const kindLabel = section.kind === 'header' ? 'Cabeçalho' : section.kind === 'footer' ? 'Rodapé' : section.name;
  return (
    <>
      <div className="ed-section-tag" onPointerDown={(e) => e.stopPropagation()} onClick={() => select({ kind: 'section', id: section.id })}>
        {kindLabel}
        <span className="ed-section-mode">{isFlow(section) ? 'containers' : 'livre'}</span>
        {device === 'mobile' && section.mobileHidden && ' · oculta no celular'}
      </div>
      {selected && section.kind === 'body' && (
        <div className="ed-section-tools" onPointerDown={(e) => e.stopPropagation()}>
          <button title="Mover para cima" disabled={index <= 0} onClick={() => moveSection(section.id, -1)}>
            <Icon name="up" />
          </button>
          <button title="Mover para baixo" disabled={index >= page.sections.length - 1} onClick={() => moveSection(section.id, 1)}>
            <Icon name="down" />
          </button>
          <button title="Duplicar seção" onClick={() => duplicateSection(section.id)}>
            <Icon name="copy" />
          </button>
          <button title="Excluir seção" onClick={() => void confirmDeleteSection(section)}>
            <Icon name="trash" />
          </button>
        </div>
      )}
      {section.kind !== 'footer' && (
        <button className="ed-add-section" onPointerDown={(e) => e.stopPropagation()} onClick={() => addBlankSection(section.id)}>
          + Adicionar seção
        </button>
      )}
    </>
  );
}

function EditorFlowSection({ section, device, env, site }: { section: Section; device: DeviceMode; env: RenderEnv; site: Site }) {
  const selected = useEditor((s) => s.selection?.kind === 'section' && s.selection.id === section.id);
  const select = useEditor((s) => s.select);
  const hidden = device === 'mobile' && section.mobileHidden;
  return (
    <div
      className={`wb-section wb-flow s-${section.id} ed-section ed-flow ed-kind-${section.kind}${selected ? ' is-selected' : ''}${hidden ? ' is-hidden-mobile' : ''}`}
      data-section-id={section.id}
      style={sectionBackground(section)}
      onPointerDown={(e) => e.button === 0 && select({ kind: 'section', id: section.id })}
      {...flowDropHandlers}
    >
      {section.background.overlay && <div className="wb-overlay" style={{ background: resolveColor(section.background.overlay) }} />}
      <FlowNodeEditor node={section.root!} env={env} root />
      <SectionChrome section={section} site={site} pageId={env.pageId} device={device} />
    </div>
  );
}

function EditorSection({ section, device, env, site }: { section: Section; device: DeviceMode; env: RenderEnv; site: Site }) {
  const selection = useEditor((s) => s.selection);
  const guides = useEditor((s) => s.guides);
  const select = useEditor((s) => s.select);
  const selected = selection?.kind === 'section' && selection.id === section.id;
  const selectedEl = selection?.kind === 'element' ? section.elements.find((e) => e.id === selection.id) : undefined;
  const tablet = device === 'tablet';
  const height = sectionHeight(section, device);
  const visible = section.elements.filter((el) => device !== 'mobile' || !el.mobileHidden);

  const onDrop = (e: React.DragEvent) => {
    const data = e.dataTransfer.getData(ADD_MIME);
    if (!data) return;
    e.preventDefault();
    const [ci, ii] = data.split(':').map(Number);
    const seed = ADD_CATEGORIES[ci]?.items[ii]?.seed();
    if (!seed) return;
    const inner = (e.currentTarget as HTMLElement).querySelector('.wb-inner')!.getBoundingClientRect();
    const w = device === 'mobile' ? Math.min(seed.w, contentWidth('mobile') - 40) : seed.w;
    addElement(seed, { sectionId: section.id, x: e.clientX - inner.left - w / 2, y: e.clientY - inner.top - seed.h / 2 });
  };

  return (
    <div
      className={`wb-section wb-free s-${section.id} ed-section ed-kind-${section.kind}${selected ? ' is-selected' : ''}${device === 'mobile' && section.mobileHidden ? ' is-hidden-mobile' : ''}${tablet ? ' ed-tablet-locked' : ''}`}
      data-section-id={section.id}
      style={{ ...sectionBackground(section), height, zoom: tablet ? TABLET_FREE_ZOOM : undefined }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        select({ kind: 'section', id: section.id });
      }}
      onDragOver={(e) => {
        if (!tablet && e.dataTransfer.types.includes(ADD_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
        }
      }}
      onDrop={onDrop}
    >
      {section.background.overlay && <div className="wb-overlay" style={{ background: resolveColor(section.background.overlay) }} />}
      <div className="wb-inner ed-inner" style={{ width: contentWidth(device) }}>
        {visible.map((el) => (
          <ElementFrame key={el.id} el={el} section={section} device={device} env={env} />
        ))}
        {selectedEl && !tablet && <SelectionBox el={selectedEl} section={section} device={device} />}
        {guides?.sectionId === section.id && (
          <>
            {guides.x.map((x, i) => (
              <div key={`x${i}`} className="ed-guide ed-guide-v" style={{ left: x }} />
            ))}
            {guides.y.map((y, i) => (
              <div key={`y${i}`} className="ed-guide ed-guide-h" style={{ top: y }} />
            ))}
          </>
        )}
      </div>
      {tablet && <div className="ed-tablet-note">Seção em modo livre: no tablet ela aparece reduzida. Edite no computador ou no celular.</div>}
      <SectionChrome section={section} site={site} pageId={env.pageId} device={device} />
      {!tablet && (
        <div className="ed-section-resize" title="Arraste para ajustar a altura" onPointerDown={(e) => startSectionResize(e, section.id)}>
          <span />
        </div>
      )}
    </div>
  );
}

function ElementFrame({ el, section, device, env }: { el: SiteElement; section: Section; device: DeviceMode; env: RenderEnv }) {
  const editing = useEditor((s) => s.editingTextId === el.id);
  const selected = useEditor((s) => s.selection?.kind === 'element' && s.selection.id === el.id);
  const select = useEditor((s) => s.select);
  const setEditingText = useEditor((s) => s.setEditingText);
  const g = elementGeom(section, el, device);
  const def = ELEMENTS[el.type];
  const tablet = device === 'tablet';

  const style: CSSProperties = { left: g.x, top: g.y, width: g.w, height: g.h };
  return (
    <div
      className={`ed-frame${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}${el.locked ? ' is-locked' : ''}`}
      data-el-id={el.id}
      style={style}
      onPointerDown={(e) => {
        e.stopPropagation();
        if (editing || e.button !== 0) return;
        select({ kind: 'element', id: el.id });
        if (!el.locked && !tablet) startMove(e, el.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (def.inlineText && !el.locked && !tablet) setEditingText(el.id);
      }}
    >
      <div className={`wb-el wb-t-${el.type}`} style={{ ...elementCss(el), inset: 0 }}>
        {editing ? (
          <InlineTextEditor
            el={el}
            onCommit={(value) =>
              useEditor.getState().mutate(
                (d) => {
                  const f = findElement(d, el.id);
                  if (!f) return;
                  if (def.inlineText === 'html') f.element.props.html = value;
                  else f.element.props.label = value;
                },
                { history: false },
              )
            }
            onInput={(box) => {
              // Texto cresceu: aumenta a altura do elemento.
              const st = useEditor.getState();
              const f = findElement(st.site!, el.id);
              if (!f || def.inlineText !== 'html') return;
              const cur = elementGeom(f.section, f.element, st.device);
              const needed = Math.ceil(box.scrollHeight);
              if (needed > cur.h) setGeom(el.id, { h: needed });
            }}
          />
        ) : (
          <ElementContent el={el} env={env} />
        )}
      </div>
    </div>
  );
}

const HANDLES: HandleDir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

function SelectionBox({ el, section, device }: { el: SiteElement; section: Section; device: DeviceMode }) {
  const editing = useEditor((s) => s.editingTextId === el.id);
  const setEditingText = useEditor((s) => s.setEditingText);
  const g = elementGeom(section, el, device);
  const def = ELEMENTS[el.type];
  const handles = el.locked ? [] : el.type === 'line' ? (['e', 'w'] as HandleDir[]) : HANDLES;

  return (
    <div className="ed-selection" style={{ left: g.x, top: g.y, width: g.w, height: g.h }}>
      {!editing && handles.map((h) => <div key={h} className={`ed-handle ed-handle-${h}`} onPointerDown={(e) => startResize(e, el.id, h)} />)}
      <div className={`ed-el-toolbar${g.y < 44 ? ' is-below' : ''}`} onPointerDown={(e) => e.stopPropagation()}>
        {editing ? (
          <TextToolbar />
        ) : (
          <>
            <span className="ed-el-toolbar-label">{el.name || def.label}</span>
            {def.inlineText && !el.locked && (
              <button title="Editar texto (duplo clique)" onClick={() => setEditingText(el.id)}>
                <Icon name="edit" />
              </button>
            )}
            <button title="Trazer para frente" onClick={() => arrangeElement(el.id, 'forward')}>
              <Icon name="up" />
            </button>
            <button title="Enviar para trás" onClick={() => arrangeElement(el.id, 'backward')}>
              <Icon name="down" />
            </button>
            <button title="Duplicar (Ctrl+D)" onClick={() => duplicateElement(el.id)}>
              <Icon name="copy" />
            </button>
            <button title="Excluir (Delete)" onClick={() => deleteElement(el.id)}>
              <Icon name="trash" />
            </button>
          </>
        )}
      </div>
      <div className="ed-size-badge">
        {Math.round(g.w)} × {Math.round(g.h)}
      </div>
    </div>
  );
}
