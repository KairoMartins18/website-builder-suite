// Arrastar e soltar em seções com containers: calcula onde o item vai entrar.
import type React from 'react';
import { create } from 'zustand';
import { moveNode } from './flowActions';

export interface DropTarget {
  containerId: string;
  /** Índice no array `children` do container (contando o próprio item arrastado). */
  index: number;
  /** Linha indicadora em coordenadas da janela. */
  line: { x: number; y: number; w: number; h: number };
}

export const useDnd = create<{ drop: DropTarget | null; dragLabel: string | null }>(() => ({ drop: null, dragLabel: null }));

const CONTAINER = '[data-node-kind="container"]';

export function computeDrop(x: number, y: number, draggingId?: string): DropTarget | null {
  const dragged = draggingId ? document.querySelector<HTMLElement>(`[data-node-id="${draggingId}"]`) : null;
  const top = document.elementsFromPoint(x, y).find((el) => el.closest('.ed-flow') && !el.closest('.ed-overlay')) as HTMLElement | undefined;
  if (!top) return null;
  let c = top.closest<HTMLElement>(CONTAINER);
  // Não dá para soltar um container dentro dele mesmo.
  while (c && dragged && (dragged === c || dragged.contains(c))) c = c.parentElement?.closest<HTMLElement>(CONTAINER) ?? null;
  if (!c) return null;

  const cs = getComputedStyle(c);
  const grid = cs.display === 'grid';
  const row = !grid && cs.flexDirection.startsWith('row');
  const all = [...c.children].filter((k): k is HTMLElement => !!(k as HTMLElement).dataset?.nodeId);
  const kids = all.filter((k) => k !== dragged);

  let i = kids.length;
  for (let k = 0; k < kids.length; k++) {
    const r = kids[k].getBoundingClientRect();
    const before = grid ? y < r.top || (y <= r.bottom && x < r.left + r.width / 2) : row ? x < r.left + r.width / 2 : y < r.top + r.height / 2;
    if (before) {
      i = k;
      break;
    }
  }

  const cr = c.getBoundingClientRect();
  let line: DropTarget['line'];
  if (!kids.length) line = { x: cr.left + 8, y: cr.top + Math.min(cr.height / 2, 24), w: cr.width - 16, h: 3 };
  else if (i < kids.length) {
    const r = kids[i].getBoundingClientRect();
    line = row || grid ? { x: r.left - 4, y: r.top, w: 3, h: r.height } : { x: r.left, y: r.top - 3, w: r.width, h: 3 };
  } else {
    const r = kids[kids.length - 1].getBoundingClientRect();
    line = row || grid ? { x: r.right + 1, y: r.top, w: 3, h: r.height } : { x: r.left, y: r.bottom + 1, w: r.width, h: 3 };
  }
  const index = i < kids.length ? all.indexOf(kids[i]) : all.length;
  return { containerId: c.dataset.nodeId!, index, line };
}

/** Arrastar um nó existente para outra posição/container. */
export function startNodeDrag(e: React.PointerEvent, id: string, label: string) {
  const sx = e.clientX;
  const sy = e.clientY;
  let dragging = false;
  const move = (ev: PointerEvent) => {
    if (!dragging) {
      if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      dragging = true;
      document.body.classList.add('ed-dragging');
      useDnd.setState({ dragLabel: label });
    }
    ev.preventDefault();
    useDnd.setState({ drop: computeDrop(ev.clientX, ev.clientY, id) });
  };
  const up = () => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    document.body.classList.remove('ed-dragging');
    const { drop } = useDnd.getState();
    useDnd.setState({ drop: null, dragLabel: null });
    if (dragging && drop) moveNode(id, drop.containerId, drop.index);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}
