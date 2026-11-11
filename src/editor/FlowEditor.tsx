import { useEffect, useState } from 'react';
import type React from 'react';
import type { ContainerNode, FlowNode, WidgetNode } from '../types';
import { useEditor } from '../store/editor';
import { findNode, nodeLabel, STRUCTURES } from '../lib/flow';
import { ElementContent, type RenderEnv } from '../render/ElementContent';
import { ADD_CATEGORIES, ELEMENTS } from '../elements/registry';
import { Icon } from '../components/Icon';
import { InlineTextEditor, TextToolbar } from './InlineText';
import { computeDrop, startNodeDrag, useDnd } from './flowDnd';
import { addStructure, addWidget, deleteNode, duplicateNode, moveNodeSibling, updateNode, wrapInContainer } from './flowActions';

export const ADD_MIME = 'application/x-wb-add';
export const STRUCT_MIME = 'application/x-wb-structure';

const LABELS = Object.fromEntries(Object.values(ELEMENTS).map((d) => [d.type, d.label]));
export const labelOf = (n: FlowNode) => nodeLabel(n, LABELS);

/** Soltar itens do painel "Adicionar" dentro dos containers. */
export const flowDropHandlers = {
  onDragOver(e: React.DragEvent) {
    const types = e.dataTransfer.types;
    if (!types.includes(ADD_MIME) && !types.includes(STRUCT_MIME)) return;
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
    useDnd.setState({ drop: computeDrop(e.clientX, e.clientY) });
  },
  onDragLeave(e: React.DragEvent) {
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) useDnd.setState({ drop: null });
  },
  onDrop(e: React.DragEvent) {
    const drop = computeDrop(e.clientX, e.clientY);
    useDnd.setState({ drop: null });
    if (!drop) return;
    e.preventDefault();
    e.stopPropagation();
    const at = { containerId: drop.containerId, index: drop.index };
    const struct = e.dataTransfer.getData(STRUCT_MIME);
    if (struct) {
      const s = STRUCTURES.find((x) => x.id === struct);
      if (s) addStructure(s, at);
      return;
    }
    const [ci, ii] = e.dataTransfer.getData(ADD_MIME).split(':').map(Number);
    const seed = ADD_CATEGORIES[ci]?.items[ii]?.seed();
    if (seed) addWidget(seed, at);
  },
};

export function FlowNodeEditor({ node, env, root }: { node: FlowNode; env: RenderEnv; root?: boolean }) {
  const selected = useEditor((s) => s.selection?.kind === 'node' && s.selection.id === node.id);
  const editing = useEditor((s) => s.editingTextId === node.id);
  const select = useEditor((s) => s.select);
  const setEditingText = useEditor((s) => s.setEditingText);

  const onPointerDown = (e: React.PointerEvent) => {
    if (root || e.button !== 0) return;
    e.stopPropagation();
    if (editing) return;
    select({ kind: 'node', id: node.id });
    startNodeDrag(e, node.id, labelOf(node));
  };

  if (node.kind === 'container') {
    const c = node as ContainerNode;
    return (
      <div
        className={`wb-c n-${c.id} ed-node ed-container${root ? ' ed-root' : ''}${selected ? ' is-selected' : ''}`}
        data-node-id={c.id}
        data-node-kind="container"
        onPointerDown={onPointerDown}
      >
        {c.children.map((child) => (
          <FlowNodeEditor key={child.id} node={child} env={env} />
        ))}
        {!c.children.length && <div className="ed-empty">{root ? 'Seção vazia — adicione uma estrutura ou um widget pelo painel “Adicionar”' : 'Arraste widgets para cá'}</div>}
      </div>
    );
  }

  const w = node as WidgetNode;
  const def = ELEMENTS[w.type];
  return (
    <div
      className={`wb-el wb-t-${w.type} n-${w.id} ed-node ed-widget${selected ? ' is-selected' : ''}${editing ? ' is-editing' : ''}`}
      data-node-id={w.id}
      data-node-kind="widget"
      onPointerDown={onPointerDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (def.inlineText) setEditingText(w.id);
      }}
    >
      {editing ? (
        <InlineTextEditor
          el={w}
          onCommit={(value) =>
            useEditor.getState().mutate(
              (d) => {
                const l = findNode(d, w.id);
                if (l?.node.kind !== 'widget') return;
                if (def.inlineText === 'html') l.node.props.html = value;
                else l.node.props.label = value;
              },
              { history: false },
            )
          }
        />
      ) : (
        <ElementContent el={w} env={env} />
      )}
    </div>
  );
}

/** Acompanha a posição do nó selecionado na tela (para a barra de ferramentas flutuante). */
function useNodeRect(id: string | null) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  useEffect(() => {
    if (!id) {
      setRect(null);
      return;
    }
    let raf = 0;
    let last = '';
    const tick = () => {
      const el = document.querySelector(`[data-node-id="${id}"]`);
      const r = el?.getBoundingClientRect() ?? null;
      const key = r ? `${r.left}|${r.top}|${r.width}|${r.height}` : '';
      if (key !== last) {
        last = key;
        setRect(r);
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [id]);
  return rect;
}

/** Barra flutuante do nó selecionado + indicador de soltura. */
export function FlowOverlay() {
  const site = useEditor((s) => s.site)!;
  const selection = useEditor((s) => s.selection);
  const editingId = useEditor((s) => s.editingTextId);
  const setEditingText = useEditor((s) => s.setEditingText);
  const drop = useDnd((s) => s.drop);
  const dragLabel = useDnd((s) => s.dragLabel);
  const id = selection?.kind === 'node' ? selection.id : null;
  const loc = id ? findNode(site, id) : undefined;
  const rect = useNodeRect(loc ? id : null);
  const canvas = document.querySelector('.ed-canvas-scroll')?.getBoundingClientRect();

  let toolbar = null;
  if (loc && rect && canvas && !dragLabel && rect.bottom > canvas.top && rect.top < canvas.bottom) {
    const node = loc.node;
    const editing = editingId === node.id;
    const def = node.kind === 'widget' ? ELEMENTS[node.type] : null;
    const top = rect.top - 40 < canvas.top ? Math.min(rect.bottom + 6, canvas.bottom - 40) : rect.top - 40;
    toolbar = (
      <div className="ed-el-toolbar ed-flow-toolbar" style={{ left: Math.max(canvas.left + 4, rect.left), top }} onPointerDown={(e) => e.stopPropagation()}>
        {editing ? (
          <TextToolbar />
        ) : (
          <>
            <span className="ed-drag-handle" title="Arraste para mover" onPointerDown={(e) => startNodeDrag(e, node.id, labelOf(node))}>
              ⠿
            </span>
            <span className="ed-el-toolbar-label">{labelOf(node)}</span>
            {def?.inlineText && (
              <button title="Editar texto (duplo clique)" onClick={() => setEditingText(node.id)}>
                <Icon name="edit" />
              </button>
            )}
            <button title="Mover para antes" disabled={loc.index === 0} onClick={() => moveNodeSibling(node.id, -1)}>
              <Icon name="up" />
            </button>
            <button title="Mover para depois" disabled={!loc.parent || loc.index >= loc.parent.children.length - 1} onClick={() => moveNodeSibling(node.id, 1)}>
              <Icon name="down" />
            </button>
            <button title="Agrupar num container" onClick={() => wrapInContainer(node.id)}>
              <Icon name="sections" />
            </button>
            <button title="Duplicar (Ctrl+D)" onClick={() => duplicateNode(node.id)}>
              <Icon name="copy" />
            </button>
            <button title="Excluir (Delete)" onClick={() => deleteNode(node.id)}>
              <Icon name="trash" />
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="ed-overlay">
      {toolbar}
      {drop && <div className="ed-drop-line" style={{ left: drop.line.x, top: drop.line.y, width: drop.line.w, height: drop.line.h }} />}
    </div>
  );
}

/** Renomear um nó (usado pelo inspector). */
export const renameNode = (id: string, name: string) => updateNode(id, (n) => void (name ? (n.name = name) : delete n.name), 'name');
