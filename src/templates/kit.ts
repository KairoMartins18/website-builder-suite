// Kit para montar temas com containers (layout em fluxo e responsivo).
import type { ContainerNode, ContainerProps, ElementStyle, FlowNode, Link, NodeLayout, NodeOverride, Section, SectionBackground, WidgetNode } from '../types';
import { uid } from '../lib/id';
import { newContainer } from '../lib/flow';
import { newSection } from '../lib/siteOps';

type Resp = { tablet?: NodeOverride; mobile?: NodeOverride };
interface Opts {
  style?: ElementStyle;
  layout?: NodeLayout;
  responsive?: Resp;
  link?: Link;
  name?: string;
}

const widget = (type: WidgetNode['type'], props: WidgetNode['props'], o: Opts = {}): WidgetNode => ({
  id: uid('n'),
  kind: 'widget',
  type,
  props,
  style: o.style ?? {},
  layout: o.layout ?? {},
  link: o.link,
  responsive: o.responsive,
  name: o.name,
});

/** Título com tamanho reduzido automaticamente no tablet/celular. */
export function heading(html: string, size: number, style: ElementStyle = {}, level = 2, o: Opts = {}): WidgetNode {
  return widget('heading', { html, level }, {
    ...o,
    style: { fontFamily: 'theme:heading', color: 'theme:text', fontSize: size, fontWeight: 700, lineHeight: 1.15, ...style },
    responsive: o.responsive ?? (size > 28 ? { tablet: { style: { fontSize: Math.round(size * 0.82) } }, mobile: { style: { fontSize: Math.max(26, Math.round(size * 0.62)) } } } : undefined),
  });
}

export const text = (html: string, style: ElementStyle = {}, o: Opts = {}) =>
  widget('text', { html }, { ...o, style: { fontFamily: 'theme:body', color: 'theme:text', fontSize: 17, lineHeight: 1.65, ...style } });

export const eyebrow = (label: string, style: ElementStyle = {}) =>
  text(label, { fontSize: 13, fontWeight: 700, letterSpacing: 2.5, textTransform: 'uppercase', color: 'theme:primary', lineHeight: 1.3, ...style });

export const button = (label: string, style: ElementStyle = {}, link?: Link, o: Opts = {}) =>
  widget('button', { label }, { ...o, link, style: { background: 'theme:primary', color: '#ffffff', fontFamily: 'theme:body', fontSize: 16, fontWeight: 600, borderRadius: 10, ...style } });

export const ghostButton = (label: string, color: string, style: ElementStyle = {}, link?: Link) =>
  button(label, { background: undefined, color, borderWidth: 2, borderColor: color, ...style }, link);

export const image = (src: string, alt: string, height?: number, style: ElementStyle = {}, o: Opts = {}) =>
  widget('image', { src, alt, fit: 'cover' }, { ...o, style, layout: { height, ...o.layout } });

export const menu = (style: ElementStyle = {}, props: Record<string, unknown> = {}) =>
  widget('menu', { direction: 'row', gap: 30, activeColor: 'theme:primary', ...props }, { style: { color: 'theme:text', fontFamily: 'theme:body', fontSize: 15, fontWeight: 500, textAlign: 'right', ...style }, layout: { width: 'fill' } });

export const social = (iconColor: string, align: ElementStyle['textAlign'] = 'left') =>
  widget('social', { instagram: '#', facebook: '#', linkedin: '#', youtube: '#', size: 24, iconColor }, { style: { textAlign: align } });

export const gallery = (images: string[], columns = 3, gap = 12, radius = 10) =>
  widget('gallery', { images: images.map((src) => ({ src, alt: '' })), columns, gap, radius }, { responsive: { mobile: { style: {} } } });

export const form = (fields: { label: string; type: string; required?: boolean }[], submitLabel: string, style: ElementStyle = {}, buttonColor = 'theme:primary') =>
  widget('form', { fields, submitLabel, buttonColor, email: '' }, { style: { fontFamily: 'theme:body', fontSize: 15, color: 'theme:text', ...style } });

export const map = (address: string, height = 360, style: ElementStyle = {}) => widget('map', { address, zoom: 15 }, { style, layout: { height, width: 'fill' } });

export const line = (color: string) => widget('line', {}, { style: { borderWidth: 1, borderColor: color, borderStyle: 'solid' } });

/** Container genérico. */
export function box(props: Partial<ContainerProps>, children: FlowNode[], o: Opts & { tag?: ContainerNode['tag'] } = {}): ContainerNode {
  return newContainer(props, children, { style: o.style ?? {}, layout: o.layout ?? {}, responsive: o.responsive, name: o.name, tag: o.tag });
}

/** Linha de colunas que vira pilha no celular. */
export function row(children: FlowNode[], props: Partial<ContainerProps> = {}, o: Opts = {}): ContainerNode {
  return box({ direction: 'row', gap: 40, align: 'center', ...props }, children, {
    ...o,
    responsive: { ...o.responsive, mobile: { ...o.responsive?.mobile, props: { direction: 'column', align: 'stretch', ...o.responsive?.mobile?.props } } },
  });
}

/** Coluna que ocupa o espaço disponível na linha. */
export const col = (children: FlowNode[], props: Partial<ContainerProps> = {}, o: Opts = {}) =>
  box({ gap: 18, ...props }, children, { ...o, layout: { width: 'fill', ...o.layout } });

/** Grade responsiva: N colunas no computador, 2 no tablet, 1 no celular. */
export const grid = (columns: number, children: FlowNode[], gap = 24, o: Opts = {}) =>
  box({ display: 'grid', columns, gap }, children, {
    ...o,
    responsive: { tablet: { props: { columns: Math.min(columns, 2) } }, mobile: { props: { columns: 1 } } },
  });

/** Cartão (container com fundo, cantos e espaçamento). */
export const card = (children: FlowNode[], style: ElementStyle, padding = 32, props: Partial<ContainerProps> = {}) =>
  box({ gap: 14, paddingY: padding, paddingX: padding, ...props }, children, { style, responsive: { mobile: { props: { paddingY: Math.round(padding * 0.75), paddingX: Math.round(padding * 0.75) } } } });

/** Seção em fluxo com conteúdo encaixotado e espaçamento vertical que encolhe no celular. */
export function flowSection(name: string, children: FlowNode[], background: SectionBackground = {}, rootProps: Partial<ContainerProps> = {}, kind: Section['kind'] = 'body'): Section {
  const py = rootProps.paddingY ?? 96;
  const root = newContainer({ paddingY: py, paddingX: 24, maxWidth: 1140, gap: 40, ...rootProps }, children);
  root.responsive = { tablet: { props: { paddingY: Math.round(py * 0.8) } }, mobile: { props: { paddingY: Math.round(py * 0.6), paddingX: 20, gap: 28 } } };
  return newSection(kind, kind === 'header' ? 'Cabeçalho' : kind === 'footer' ? 'Rodapé' : name, 0, { layout: 'flow', root, background });
}

/** Cabeçalho: logo + menu (vira hambúrguer no celular) + botão (oculto no celular). */
export function headerSection(brand: ReturnType<typeof heading>, menuWidget: WidgetNode, cta: WidgetNode | null, background: SectionBackground, sticky = true): Section {
  if (cta) cta.responsive = { ...cta.responsive, mobile: { layout: { hidden: true } } };
  const r = box({ direction: 'row', align: 'center', gap: 28, justify: 'space-between' }, [brand, menuWidget, ...(cta ? [cta] : [])]);
  r.layout = { width: 'fill' };
  const s = flowSection('Cabeçalho', [r], background, { paddingY: 18 }, 'header');
  s.root!.responsive = { mobile: { props: { paddingY: 12, paddingX: 20 } } };
  s.sticky = sticky;
  return s;
}
