// Layout em fluxo: containers flex/grid (estilo Elementor) com ajustes por breakpoint.
import type { CSSProperties } from 'react';
import {
  MOBILE_MAX,
  TABLET_MAX,
  type ContainerNode,
  type ContainerProps,
  type DeviceMode,
  type ElementStyle,
  type FlowNode,
  type NodeLayout,
  type NodeOverride,
  type Section,
  type Site,
  type WidgetNode,
} from '../types';
import { uid } from './id';
import { allSections, newSection } from './siteOps';
import { elementCss } from './theme';

export const isFlow = (s: Section): s is Section & { root: ContainerNode } => s.layout === 'flow' && !!s.root;

export const DEFAULT_CONTAINER: ContainerProps = {
  display: 'flex',
  direction: 'column',
  justify: 'flex-start',
  align: 'stretch',
  gap: 20,
  wrap: false,
  columns: 2,
  paddingY: 0,
  paddingX: 0,
};

export function newContainer(props: Partial<ContainerProps> = {}, children: FlowNode[] = [], extra: Partial<ContainerNode> = {}): ContainerNode {
  return { id: uid('n'), kind: 'container', props: { ...DEFAULT_CONTAINER, ...props }, style: {}, layout: {}, children, ...extra };
}

export function newFlowSection(name: string, root: ContainerNode, partial: Partial<Section> = {}): Section {
  return newSection('body', name, 0, { layout: 'flow', root, ...partial });
}

/** Seção em fluxo vazia: raiz encaixotada com espaçamento confortável. */
export function blankFlowSection(name = 'Nova seção'): Section {
  return newFlowSection(name, newContainer({ paddingY: 80, paddingX: 20, maxWidth: 1140, minHeight: 200 }));
}

// ---------------- valores efetivos por breakpoint ----------------

type Overrides = { tablet?: NodeOverride; mobile?: NodeOverride } | undefined;

function cascade<T extends object>(base: T, r: Overrides, key: keyof NodeOverride, device: DeviceMode): T {
  if (device === 'desktop' || !r) return base;
  const tablet = r.tablet?.[key] as Partial<T> | undefined;
  const mobile = device === 'mobile' ? (r.mobile?.[key] as Partial<T> | undefined) : undefined;
  return tablet || mobile ? { ...base, ...tablet, ...mobile } : base;
}

export const effProps = (n: ContainerNode, d: DeviceMode): ContainerProps => cascade(n.props, n.responsive, 'props', d);
export const effStyle = (n: FlowNode, d: DeviceMode): ElementStyle => cascade(n.style, n.responsive, 'style', d);
export const effLayout = (n: FlowNode, d: DeviceMode): NodeLayout => cascade(n.layout, n.responsive, 'layout', d);

export function hasOverrides(n: FlowNode, d: 'tablet' | 'mobile'): boolean {
  const o = n.responsive?.[d];
  return !!o && Object.values(o).some((v) => v && Object.keys(v).length > 0);
}

// ---------------- árvore ----------------

export interface NodeLocation {
  section: Section;
  node: FlowNode;
  parent: ContainerNode | null;
  index: number;
}

export function* walk(node: FlowNode, parent: ContainerNode | null = null): Generator<{ node: FlowNode; parent: ContainerNode | null; index: number }> {
  yield { node, parent, index: parent ? parent.children.indexOf(node) : 0 };
  if (node.kind === 'container') for (const c of node.children) yield* walk(c, node);
}

export function findNode(site: Site, id: string): NodeLocation | undefined {
  for (const section of allSections(site)) {
    if (!isFlow(section)) continue;
    for (const { node, parent, index } of walk(section.root)) if (node.id === id) return { section, node, parent, index };
  }
  return undefined;
}

export function isDescendant(ancestor: FlowNode, id: string): boolean {
  for (const { node } of walk(ancestor)) if (node.id === id) return true;
  return false;
}

/** Copia um nó com novos IDs (duplicar / colar). */
export function cloneNode<T extends FlowNode>(node: T): T {
  const copy = structuredClone(node) as T;
  for (const { node: n } of walk(copy)) n.id = uid('n');
  return copy;
}

export function nodeLabel(n: FlowNode, labels: Record<string, string>): string {
  if (n.name) return n.name;
  if (n.kind === 'container') return n.props.display === 'grid' ? 'Grade' : n.props.direction === 'row' ? 'Container (linha)' : 'Container';
  return labels[n.type] ?? n.type;
}

// ---------------- estruturas prontas (como as "estruturas" do Elementor) ----------------

export interface Structure {
  id: string;
  label: string;
  /** Larguras das colunas em %. */
  cols: number[];
}

export const STRUCTURES: Structure[] = [
  { id: '1', label: '1 coluna', cols: [100] },
  { id: '2', label: '2 colunas', cols: [50, 50] },
  { id: '3', label: '3 colunas', cols: [33, 33, 33] },
  { id: '4', label: '4 colunas', cols: [25, 25, 25, 25] },
  { id: '30-70', label: '30 / 70', cols: [30, 70] },
  { id: '70-30', label: '70 / 30', cols: [70, 30] },
];

/** Linha com colunas que vira pilha vertical no celular. */
export function buildStructure(s: Structure): ContainerNode {
  if (s.cols.length === 1) return newContainer({ paddingY: 10 }, [], { layout: { width: 'fill' } });
  const equal = s.cols.every((c) => c === s.cols[0]);
  const row = newContainer(
    { direction: 'row', gap: 30, align: 'stretch' },
    s.cols.map((c) => newContainer({ gap: 16 }, [], { layout: { width: equal ? 'fill' : c } })),
  );
  row.responsive = { mobile: { props: { direction: 'column' } } };
  for (const col of row.children) col.responsive = { mobile: { layout: { width: 'fill' } } };
  return row;
}

// ---------------- CSS ----------------

const UNITLESS = new Set(['opacity', 'fontWeight', 'lineHeight', 'zIndex', 'flex', 'flexGrow', 'flexShrink', 'order']);

export function cssText(obj: CSSProperties): string {
  let out = '';
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null || v === '') continue;
    const prop = k.startsWith('--') ? k : k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
    out += `${prop}:${typeof v === 'number' && !UNITLESS.has(k) ? `${v}px` : v};`;
  }
  return out;
}

function containerDecl(p: ContainerProps, isRoot: boolean): string {
  let css =
    p.display === 'grid'
      ? `display:grid;grid-template-columns:repeat(${Math.max(1, p.columns)},minmax(0,1fr));align-items:${p.align === 'stretch' ? 'stretch' : p.align};`
      : `display:flex;flex-direction:${p.direction};justify-content:${p.justify};align-items:${p.align};flex-wrap:${p.wrap ? 'wrap' : 'nowrap'};`;
  css += `gap:${p.gap}px;padding:${p.paddingY}px ${p.paddingX}px;`;
  if (p.minHeight) css += `min-height:${p.minHeight}px;`;
  if (isRoot) css += `width:100%;margin:0 auto;${p.maxWidth ? `max-width:${p.maxWidth + p.paddingX * 2}px;` : ''}`;
  return css;
}

const BUTTON_SELF: Record<string, string> = { center: 'center', right: 'flex-end', justify: 'stretch' };

/** Como o item se comporta dentro do container pai. */
function itemDecl(node: FlowNode, layout: NodeLayout, style: ElementStyle, parent: ContainerProps | null): string {
  if (!parent) return '';
  let css = '';
  const w = layout.width;
  if (parent.display === 'flex') {
    if (parent.direction === 'row') {
      if (w === 'fill') css += 'flex:1 1 0;min-width:0;';
      else if (typeof w === 'number') css += `flex:0 1 ${w}%;min-width:0;`;
      else css += 'flex:0 1 auto;min-width:0;';
    } else if (typeof w === 'number') css += `width:${w}%;`;
  }
  let self: string | undefined = layout.alignSelf && layout.alignSelf !== 'auto' ? layout.alignSelf : undefined;
  // Botões não esticam: alinham-se conforme o alinhamento do texto (como no Elementor).
  if (!self && node.kind === 'widget' && node.type === 'button' && parent.align === 'stretch' && !(parent.display === 'flex' && parent.direction === 'row'))
    self = BUTTON_SELF[style.textAlign ?? ''] ?? 'flex-start';
  if (self) css += `align-self:${self};`;
  if (layout.height) css += `height:${layout.height}px;`;
  return css;
}

export interface FlowCssOptions {
  /** No editor, itens ocultos aparecem esmaecidos em vez de sumir. */
  editor?: boolean;
  /**
   * Seletor (sufixo) que recebe o estilo visual do widget em vez do próprio nó.
   * Usado na exportação para WordPress (ex.: botão → " .wp-block-button__link").
   */
  styleTarget?: (w: WidgetNode) => string | undefined;
}

function nodeRules(node: FlowNode, device: DeviceMode, parent: ContainerProps | null, opts: FlowCssOptions, filter?: (n: FlowNode, parentNode: ContainerNode | null) => boolean, parentNode: ContainerNode | null = null): string {
  const layout = effLayout(node, device);
  const style = effStyle(node, device);
  let out = '';
  if (!filter || filter(node, parentNode)) {
    const target = node.kind === 'widget' ? opts.styleTarget?.(node) : undefined;
    const visual = cssText(elementCss({ type: node.kind === 'widget' ? node.type : 'shape', style }));
    let decl = target === undefined ? visual : '';
    if (target !== undefined && visual) out += `.n-${node.id}${target}{${visual}}`;
    decl += itemDecl(node, layout, style, parent);
    if (node.kind === 'container') decl += containerDecl(effProps(node, device), parent === null);
    // !important: vence o display dos blocos do WordPress (ex.: grupo de botões).
    if (layout.hidden) decl += opts.editor ? 'opacity:.35;outline:1px dashed #888;' : 'display:none!important;';
    else if (filter && node.layout.hidden && node.kind === 'widget') decl += `display:${node.type === 'button' ? 'flex' : 'block'};`;
    out += `.n-${node.id}{${decl}}`;
    if (node.kind === 'widget' && node.type === 'image' && layout.height) out += `.n-${node.id} img{height:100%}`;
  }
  if (node.kind === 'container') {
    const p = effProps(node, device);
    for (const c of node.children) out += nodeRules(c, device, p, opts, filter, node);
  }
  return out;
}

/** CSS das seções em fluxo para um dispositivo específico ou responsivo (media queries). */
export function flowCss(sections: Section[], target: DeviceMode | 'responsive', opts: FlowCssOptions = {}): string {
  const flows = sections.filter(isFlow);
  if (!flows.length) return '';
  if (target !== 'responsive') return flows.map((s) => nodeRules(s.root, target, null, opts)).join('\n');

  const desktop = flows.map((s) => nodeRules(s.root, 'desktop', null, opts)).join('\n');
  // Nos breakpoints menores só reemitimos nós afetados por ajustes (deles ou do pai).
  const touched = (bp: 'tablet' | 'mobile') => (n: FlowNode, p: ContainerNode | null) => hasOverrides(n, bp) || (!!p && hasOverrides(p, bp));
  const tablet = flows.map((s) => nodeRules(s.root, 'tablet', null, opts, touched('tablet'))).join('');
  const mobile = flows.map((s) => nodeRules(s.root, 'mobile', null, opts, touched('mobile'))).join('');
  return `${desktop}\n${tablet ? `@media (max-width:${TABLET_MAX}px){${tablet}}\n` : ''}${mobile ? `@media (max-width:${MOBILE_MAX}px){${mobile}}` : ''}`;
}
