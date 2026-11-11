import { useLayoutEffect, useMemo, useRef, type CSSProperties } from 'react';
import type React from 'react';
import type { DeviceMode, Section, Site, SiteElement } from '../types';
import { useEditor } from '../store/editor';
import { contentWidth, elementGeom, pageSections, sectionHeight } from '../lib/layout';
import { elementCss, resolveColor, themeVars } from '../lib/theme';
import { findElement } from '../lib/siteOps';
import { ElementContent, type RenderEnv } from '../render/ElementContent';
import { sectionBackground } from '../render/SiteRenderer';
import { ADD_CATEGORIES, ELEMENTS } from '../elements/registry';
import { startMove, startResize, startSectionResize, type HandleDir } from './gestures';
import {
  addBlankSection,
  addElement,
  arrangeElement,
  deleteElement,
  duplicateElement,
  duplicateSection,
  moveSection,
  setGeom,
} from './actions';
import { Icon } from '../components/Icon';
import { isDialogOpen, promptDialog } from '../components/Dialogs';
import { confirmDeleteSection } from './confirmations';

export const ADD_MIME = 'application/x-wb-add';

export function Canvas() {
  const site = useEditor((s) => s.site)!;
  const pageId = useEditor((s) => s.pageId);
  const device = useEditor((s) => s.device);
  const select = useEditor((s) => s.select);
  const page = site.pages.find((p) => p.id === pageId) ?? site.pages[0];
  const sections = pageSections(site, page);
  const env = useMemo<RenderEnv>(() => ({ site, pageId: page.id, mode: 'edit', hrefForPage: () => '#' }), [site, page.id]);

  return (
    <div
      className="ed-canvas-scroll"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains('ed-stage')) select(null);
      }}
    >
      <div className={`ed-stage ed-stage-${device}`}>
        <div className={`wb-site ed-site${device === 'mobile' ? ' wb-mobile' : ''}`} style={{ ...themeVars(site.theme), width: device === 'mobile' ? contentWidth('mobile') : undefined }}>
          {sections.map((s) => (
            <EditorSection key={s.id} section={s} device={device} env={env} site={site} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EditorSection({ section, device, env, site }: { section: Section; device: DeviceMode; env: RenderEnv; site: Site }) {
  const selection = useEditor((s) => s.selection);
  const guides = useEditor((s) => s.guides);
  const select = useEditor((s) => s.select);
  const selected = selection?.kind === 'section' && selection.id === section.id;
  const selectedEl = selection?.kind === 'element' ? section.elements.find((e) => e.id === selection.id) : undefined;
  const height = sectionHeight(section, device);
  const page = site.pages.find((p) => p.id === env.pageId)!;
  const index = page.sections.findIndex((s) => s.id === section.id);
  const visible = section.elements.filter((el) => device === 'desktop' || !el.mobileHidden);
  const kindLabel = section.kind === 'header' ? 'Cabeçalho' : section.kind === 'footer' ? 'Rodapé' : section.name;

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
      className={`wb-section ed-section ed-kind-${section.kind}${selected ? ' is-selected' : ''}${device === 'mobile' && section.mobileHidden ? ' is-hidden-mobile' : ''}`}
      data-section-id={section.id}
      style={{ ...sectionBackground(section), height }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        select({ kind: 'section', id: section.id });
      }}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(ADD_MIME)) {
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
        {selectedEl && <SelectionBox el={selectedEl} section={section} device={device} />}
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

      <div className="ed-section-tag" onPointerDown={(e) => e.stopPropagation()} onClick={() => select({ kind: 'section', id: section.id })}>
        {kindLabel}
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
          <button
            title="Excluir seção"
            onClick={() => {
              void confirmDeleteSection(section);
            }}
          >
            <Icon name="trash" />
          </button>
        </div>
      )}

      <div className="ed-section-resize" title="Arraste para ajustar a altura" onPointerDown={(e) => startSectionResize(e, section.id)}>
        <span />
      </div>

      {section.kind !== 'footer' && (
        <button className="ed-add-section" onPointerDown={(e) => e.stopPropagation()} onClick={() => addBlankSection(section.id)}>
          + Adicionar seção
        </button>
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
        if (!el.locked) startMove(e, el.id);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (def.inlineText && !el.locked) setEditingText(el.id);
      }}
    >
      <div className={`wb-el wb-t-${el.type}`} style={{ ...elementCss(el), inset: 0 }}>
        {editing ? <InlineTextEditor el={el} /> : <ElementContent el={el} env={env} />}
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
      {!editing &&
        handles.map((h) => <div key={h} className={`ed-handle ed-handle-${h}`} onPointerDown={(e) => startResize(e, el.id, h)} />)}
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

function TextToolbar() {
  const cmd = (name: string, value?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(name, false, value);
  };
  return (
    <>
      <button title="Negrito (Ctrl+B)" onMouseDown={cmd('bold')}>
        <b>B</b>
      </button>
      <button title="Itálico (Ctrl+I)" onMouseDown={cmd('italic')}>
        <i>I</i>
      </button>
      <button title="Sublinhado (Ctrl+U)" onMouseDown={cmd('underline')}>
        <u>U</u>
      </button>
      <button
        title="Inserir link"
        onMouseDown={async (e) => {
          e.preventDefault();
          // O diálogo tira o foco do texto: guardamos a seleção para restaurá-la depois.
          const sel = window.getSelection();
          const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
          const url = await promptDialog({ title: 'Inserir link', placeholder: 'https://...', confirmLabel: 'Inserir' });
          const node = document.querySelector<HTMLElement>('.ed-inline-editor');
          if (!node) return;
          node.focus();
          if (range) {
            sel!.removeAllRanges();
            sel!.addRange(range);
          }
          if (url) document.execCommand('createLink', false, /^(https?:|mailto:|tel:|#)/i.test(url) ? url : `https://${url}`);
        }}
      >
        <Icon name="link" />
      </button>
      <button title="Limpar formatação" onMouseDown={cmd('removeFormat')}>
        T<sub>x</sub>
      </button>
      <span className="ed-el-toolbar-label">Esc para concluir</span>
    </>
  );
}

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

function InlineTextEditor({ el }: { el: SiteElement }) {
  const ref = useRef<HTMLElement>(null);
  const kind = ELEMENTS[el.type].inlineText!;
  const done = useRef(false);

  useLayoutEffect(() => {
    const node = ref.current!;
    node.innerHTML = kind === 'html' ? el.props.html ?? '' : escapeHtml(el.props.label ?? '');
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    useEditor.getState().beginGesture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    const node = ref.current;
    const st = useEditor.getState();
    if (node && findElement(st.site!, el.id)) {
      const value = kind === 'html' ? node.innerHTML : node.innerText.replace(/\s+/g, ' ').trim();
      st.mutate(
        (d) => {
          const f = findElement(d, el.id);
          if (!f) return;
          if (kind === 'html') f.element.props.html = value;
          else f.element.props.label = value;
        },
        { history: false },
      );
    }
    st.endGesture(true);
    st.setEditingText(null);
  };

  const grow = () => {
    const node = ref.current;
    const box = node?.parentElement;
    if (!node || !box || kind !== 'html') return;
    const st = useEditor.getState();
    const f = findElement(st.site!, el.id);
    if (!f) return;
    const g = elementGeom(f.section, f.element, st.device);
    const needed = Math.ceil(box.scrollHeight);
    if (needed > g.h) setGeom(el.id, { h: needed });
  };

  const Tag = (el.type === 'heading' ? `h${el.props.level ?? 2}` : el.type === 'button' ? 'span' : 'div') as 'div';
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`${el.type === 'heading' ? 'wb-heading' : el.type === 'text' ? 'wb-text' : ''} ed-inline-editor`}
      contentEditable
      suppressContentEditableWarning
      onBlur={() => {
        if (!isDialogOpen()) commit();
      }}
      onInput={grow}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && kind === 'label')) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
    />
  );
}
