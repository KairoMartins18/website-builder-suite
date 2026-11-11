import type { ContainerNode, ElementStyle, FlowNode, NodeLayout, NodeOverride, Section, SiteElement, WidgetNode } from '../types';
import { useEditor } from '../store/editor';
import { uid } from '../lib/id';
import { findSection } from '../lib/siteOps';
import { blankFlowSection, buildStructure, cloneNode, findNode, isDescendant, isFlow, newContainer, type Structure } from '../lib/flow';
import type { ElementSeed } from '../elements/registry';
import { insertSection, targetSectionId } from './actions';

const st = () => useEditor.getState();

/** Converte um elemento do painel "Adicionar" em widget de container. */
export function widgetFromSeed(seed: ElementSeed): WidgetNode {
  const s = structuredClone(seed);
  const layout: NodeLayout = {};
  if (s.type === 'map' || s.type === 'embed' || s.type === 'shape') layout.height = s.h;
  if (s.type === 'shape' || s.type === 'line') layout.width = s.type === 'line' ? undefined : 'fill';
  return { id: uid('n'), kind: 'widget', type: s.type, props: s.props, style: s.style, link: s.link, layout };
}

export function widgetFromElement(el: SiteElement): WidgetNode {
  return widgetFromSeed({ ...el });
}

export function elementFromWidget(w: WidgetNode): SiteElement {
  return { id: uid('e'), type: w.type, props: structuredClone(w.props), style: structuredClone(w.style), link: w.link && { ...w.link }, x: 0, y: 0, w: 320, h: w.layout.height ?? 80 };
}

export interface InsertAt {
  containerId: string;
  index: number;
}

/** Ponto de inserção a partir da seleção atual (ou da seção visível no centro do canvas). */
export function insertionPoint(): InsertAt | null {
  const { site, selection } = st();
  if (!site) return null;
  if (selection?.kind === 'node') {
    const loc = findNode(site, selection.id);
    if (loc) {
      if (loc.node.kind === 'container') return { containerId: loc.node.id, index: loc.node.children.length };
      if (loc.parent) return { containerId: loc.parent.id, index: loc.index + 1 };
    }
  }
  const sectionId = targetSectionId();
  const sec = sectionId ? findSection(site, sectionId) : undefined;
  if (sec && isFlow(sec)) return { containerId: sec.root.id, index: sec.root.children.length };
  return null;
}

/** Insere um nó. Se o destino for uma seção livre, cria uma nova seção em fluxo logo abaixo. */
export function insertNode(node: FlowNode, at: InsertAt | null = insertionPoint()) {
  if (!at) {
    const section = blankFlowSection();
    section.root!.children.push(node);
    insertSection(section, targetSectionId());
  } else {
    st().mutate((d) => {
      const loc = findNode(d, at.containerId);
      if (!loc || loc.node.kind !== 'container') return;
      loc.node.children.splice(Math.min(at.index, loc.node.children.length), 0, node);
    });
  }
  st().select({ kind: 'node', id: node.id });
}

export const addWidget = (seed: ElementSeed, at?: InsertAt | null) => insertNode(widgetFromSeed(seed), at === undefined ? insertionPoint() : at);
export const addStructure = (s: Structure, at?: InsertAt | null) => insertNode(buildStructure(s), at === undefined ? insertionPoint() : at);

export function moveNode(id: string, containerId: string, index: number) {
  const site = st().site;
  const loc = site && findNode(site, id);
  if (!loc?.parent || id === containerId || isDescendant(loc.node, containerId)) return;
  st().mutate((d) => {
    const from = findNode(d, id)!;
    const to = findNode(d, containerId);
    if (!to || to.node.kind !== 'container') return;
    from.parent!.children.splice(from.index, 1);
    const adjusted = from.parent!.id === containerId && from.index < index ? index - 1 : index;
    to.node.children.splice(Math.min(adjusted, to.node.children.length), 0, from.node);
  });
  st().select({ kind: 'node', id });
}

export function moveNodeSibling(id: string, dir: -1 | 1) {
  const site = st().site;
  const loc = site && findNode(site, id);
  if (!loc?.parent) return;
  const j = loc.index + dir;
  if (j < 0 || j >= loc.parent.children.length) return;
  st().mutate((d) => {
    const l = findNode(d, id)!;
    const list = l.parent!.children;
    [list[l.index], list[j]] = [list[j], list[l.index]];
  });
}

export function deleteNode(id: string) {
  const site = st().site;
  const loc = site && findNode(site, id);
  if (!loc) return;
  if (!loc.parent) {
    st().select({ kind: 'section', id: loc.section.id });
    return;
  }
  st().mutate((d) => {
    const l = findNode(d, id);
    l?.parent?.children.splice(l.index, 1);
  });
  st().select(loc.parent.id === loc.section.root?.id ? { kind: 'section', id: loc.section.id } : { kind: 'node', id: loc.parent.id });
}

export function duplicateNode(id: string) {
  const site = st().site;
  const loc = site && findNode(site, id);
  if (!loc?.parent) return;
  const copy = cloneNode(loc.node);
  insertNode(copy, { containerId: loc.parent.id, index: loc.index + 1 });
}

export function copyNode(id: string) {
  const site = st().site;
  const loc = site && findNode(site, id);
  if (loc) st().setClipboard({ kind: 'node', node: structuredClone(loc.node) });
}

/** Envolve o nó num novo container (útil para agrupar). */
export function wrapInContainer(id: string) {
  const site = st().site;
  const loc = site && findNode(site, id);
  if (!loc?.parent) return;
  const wrapper = newContainer();
  st().mutate((d) => {
    const l = findNode(d, id)!;
    wrapper.children = [l.node];
    l.parent!.children.splice(l.index, 1, wrapper);
  });
  st().select({ kind: 'node', id: wrapper.id });
}

/** Edita conteúdo (texto, imagem, link…): igual em todos os dispositivos. */
export function updateNode(id: string, recipe: (n: FlowNode) => void, key?: string) {
  st().mutate(
    (d) => {
      const l = findNode(d, id);
      if (l) recipe(l.node);
    },
    { key: key ? `${id}:${key}` : undefined },
  );
}

type Group = keyof NodeOverride;

/**
 * Define um valor de estilo/layout/container. No computador altera o valor base;
 * no tablet/celular grava um ajuste só daquele breakpoint (como no Elementor).
 */
export function setNodeValue(id: string, group: Group, key: string, value: unknown) {
  const device = st().device;
  updateNode(
    id,
    (n) => {
      let target: Record<string, unknown>;
      if (device === 'desktop') {
        if (group === 'props' && n.kind !== 'container') return;
        target = (group === 'style' ? n.style : group === 'layout' ? n.layout : (n as ContainerNode).props) as Record<string, unknown>;
      } else {
        n.responsive ??= {};
        const o = (n.responsive[device] ??= {});
        target = (o[group] ??= {}) as Record<string, unknown>;
      }
      if (value === undefined) delete target[key];
      else target[key] = value;
    },
    `${device}:${group}.${key}`,
  );
}

export const setNodeStyle = <K extends keyof ElementStyle>(id: string, key: K, value: ElementStyle[K]) => setNodeValue(id, 'style', key, value);

export function clearOverrides(id: string, device: 'tablet' | 'mobile') {
  updateNode(id, (n) => {
    if (n.responsive) delete n.responsive[device];
  });
}

/** Seção da árvore à qual o nó pertence. */
export function sectionOfNode(id: string): Section | undefined {
  const site = st().site;
  return site ? findNode(site, id)?.section : undefined;
}
