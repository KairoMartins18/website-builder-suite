import type React from 'react';
import type { Geometry } from '../types';
import { useEditor } from '../store/editor';
import { findElement, findSection } from '../lib/siteOps';
import { contentWidth, elementGeom, sectionHeight } from '../lib/layout';
import { freezeMobile, moveElementToSection, setGeom } from './actions';

const SNAP = 6;
const st = () => useEditor.getState();

export type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface SnapHit {
  delta: number;
  line: number;
}

function snap(points: number[], targets: number[]): SnapHit | null {
  let best: SnapHit | null = null;
  for (const p of points)
    for (const t of targets) {
      const d = t - p;
      if (Math.abs(d) <= SNAP && (!best || Math.abs(d) < Math.abs(best.delta))) best = { delta: d, line: t };
    }
  return best;
}

/** Alvos de alinhamento: bordas/centro da área de conteúdo e dos outros elementos. */
function snapTargets(sectionId: string, exceptId: string) {
  const { site, device } = st();
  const sec = findSection(site!, sectionId)!;
  const cw = contentWidth(device);
  const sh = sectionHeight(sec, device);
  const xs = [0, cw / 2, cw];
  const ys = [0, sh / 2, sh];
  for (const el of sec.elements) {
    if (el.id === exceptId || (device === 'mobile' && el.mobileHidden)) continue;
    const g = elementGeom(sec, el, device);
    xs.push(g.x, g.x + g.w / 2, g.x + g.w);
    ys.push(g.y, g.y + g.h / 2, g.y + g.h);
  }
  return { xs, ys };
}

function track(onMove: (ev: PointerEvent) => void, onUp: (ev: PointerEvent) => void) {
  const move = (ev: PointerEvent) => {
    ev.preventDefault();
    onMove(ev);
  };
  const up = (ev: PointerEvent) => {
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    window.removeEventListener('pointercancel', up);
    document.body.classList.remove('ed-dragging');
    onUp(ev);
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
  window.addEventListener('pointercancel', up);
}

export function startMove(e: React.PointerEvent, elementId: string) {
  const { site, device } = st();
  if (device === 'tablet') return;
  const found = site && findElement(site, elementId);
  if (!found) return;
  const sectionId = found.section.id;
  const start = elementGeom(found.section, found.element, device);
  const sx = e.clientX;
  const sy = e.clientY;
  let moved = false;
  let targets: ReturnType<typeof snapTargets> | null = null;

  track(
    (ev) => {
      let dx = ev.clientX - sx;
      let dy = ev.clientY - sy;
      if (!moved) {
        if (Math.hypot(dx, dy) < 3) return;
        moved = true;
        st().beginGesture();
        if (device === 'mobile') freezeMobile(sectionId);
        targets = snapTargets(sectionId, elementId);
        document.body.classList.add('ed-dragging');
      }
      if (ev.shiftKey) {
        if (Math.abs(dx) > Math.abs(dy)) dy = 0;
        else dx = 0;
      }
      let x = start.x + dx;
      let y = start.y + dy;
      const gx: number[] = [];
      const gy: number[] = [];
      if (!ev.altKey && targets) {
        const hx = snap([x, x + start.w / 2, x + start.w], targets.xs);
        const hy = snap([y, y + start.h / 2, y + start.h], targets.ys);
        if (hx) (x += hx.delta), gx.push(hx.line);
        if (hy) (y += hy.delta), gy.push(hy.line);
      }
      setGeom(elementId, { x, y });
      st().setGuides(gx.length || gy.length ? { sectionId, x: gx, y: gy } : null);
    },
    () => {
      st().setGuides(null);
      if (!moved) return;
      if (st().device === 'desktop') dropIntoSection(elementId, sectionId);
      st().endGesture(true);
    },
  );
}

/** Se o centro do elemento terminou sobre outra seção, transfere-o para ela. */
function dropIntoSection(elementId: string, fromSectionId: string) {
  const node = document.querySelector<HTMLElement>(`[data-el-id="${elementId}"]`);
  if (!node) return;
  const r = node.getBoundingClientRect();
  const cy = r.top + r.height / 2;
  for (const sec of document.querySelectorAll<HTMLElement>('[data-section-id]')) {
    const sr = sec.getBoundingClientRect();
    if (cy < sr.top || cy > sr.bottom) continue;
    if (sec.dataset.sectionId === fromSectionId) return;
    const inner = sec.querySelector('.wb-inner')!.getBoundingClientRect();
    moveElementToSection(elementId, sec.dataset.sectionId!, r.left - inner.left, r.top - inner.top);
    useEditor.getState().select({ kind: 'element', id: elementId });
    return;
  }
}

export function startResize(e: React.PointerEvent, elementId: string, dir: HandleDir) {
  e.stopPropagation();
  const { site, device } = st();
  if (device === 'tablet') return;
  const found = site && findElement(site, elementId);
  if (!found) return;
  const sectionId = found.section.id;
  const start: Geometry = { ...elementGeom(found.section, found.element, device) };
  const sx = e.clientX;
  const sy = e.clientY;
  const aspect = start.w / Math.max(1, start.h);
  st().beginGesture();
  if (device === 'mobile') freezeMobile(sectionId);
  const targets = snapTargets(sectionId, elementId);
  document.body.classList.add('ed-dragging');
  let changed = false;
  const MIN = 8;

  track(
    (ev) => {
      changed = true;
      const dx = ev.clientX - sx;
      const dy = ev.clientY - sy;
      let { x, y, w, h } = start;
      const gx: number[] = [];
      const gy: number[] = [];
      if (dir.includes('e')) {
        let right = start.x + start.w + dx;
        const hit = !ev.altKey && snap([right], targets.xs);
        if (hit) (right += hit.delta), gx.push(hit.line);
        w = Math.max(MIN, right - x);
      }
      if (dir.includes('w')) {
        let left = start.x + dx;
        const hit = !ev.altKey && snap([left], targets.xs);
        if (hit) (left += hit.delta), gx.push(hit.line);
        left = Math.min(left, start.x + start.w - MIN);
        w = start.x + start.w - left;
        x = left;
      }
      if (dir.includes('s')) {
        let bottom = start.y + start.h + dy;
        const hit = !ev.altKey && snap([bottom], targets.ys);
        if (hit) (bottom += hit.delta), gy.push(hit.line);
        h = Math.max(MIN, bottom - y);
      }
      if (dir.includes('n')) {
        let top = start.y + dy;
        const hit = !ev.altKey && snap([top], targets.ys);
        if (hit) (top += hit.delta), gy.push(hit.line);
        top = Math.min(top, start.y + start.h - MIN);
        h = start.y + start.h - top;
        y = top;
      }
      if (ev.shiftKey && dir.length === 2) {
        // mantém a proporção
        if (w / h > aspect) h = w / aspect;
        else w = h * aspect;
        if (dir.includes('w')) x = start.x + start.w - w;
        if (dir.includes('n')) y = start.y + start.h - h;
      }
      setGeom(elementId, { x, y, w, h });
      st().setGuides(gx.length || gy.length ? { sectionId, x: gx, y: gy } : null);
    },
    () => {
      st().setGuides(null);
      st().endGesture(changed);
    },
  );
}

export function startSectionResize(e: React.PointerEvent, sectionId: string) {
  e.stopPropagation();
  e.preventDefault();
  const { site, device } = st();
  const sec = site && findSection(site, sectionId);
  if (!sec || device === 'tablet') return;
  const startH = sectionHeight(sec, device);
  const bottoms = sec.elements.filter((el) => !(device === 'mobile' && el.mobileHidden)).map((el) => {
    const g = elementGeom(sec, el, device);
    return g.y + g.h;
  });
  const sy = e.clientY;
  st().beginGesture();
  if (device === 'mobile') freezeMobile(sectionId);
  st().select({ kind: 'section', id: sectionId });
  document.body.classList.add('ed-dragging-row');
  let changed = false;
  track(
    (ev) => {
      changed = true;
      let h = startH + ev.clientY - sy;
      const hit = !ev.altKey && snap([h], bottoms.flatMap((b) => [b, b + 40]));
      if (hit) h += hit.delta;
      h = Math.round(Math.max(40, h));
      st().mutate(
        (d) => {
          const s = findSection(d, sectionId)!;
          if (device === 'desktop') s.height = h;
          else s.mobileHeight = h;
        },
        { history: false },
      );
    },
    () => {
      document.body.classList.remove('ed-dragging-row');
      st().endGesture(changed);
    },
  );
}

export function nudge(elementId: string, dx: number, dy: number) {
  const { site, device } = st();
  const f = site && findElement(site, elementId);
  if (!f) return;
  const g = elementGeom(f.section, f.element, device);
  setGeom(elementId, { x: g.x + dx, y: g.y + dy }, { key: `nudge:${elementId}` });
}

