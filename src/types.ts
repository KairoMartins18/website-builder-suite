// Modelo de dados do site. Tudo é JSON serializável (persistido no IndexedDB
// no navegador e, futuramente, em arquivos no app Electron).

export type DeviceMode = 'desktop' | 'tablet' | 'mobile';

/** Larguras máximas de cada breakpoint (px), como no Elementor. */
export const TABLET_MAX = 1024;
export const MOBILE_MAX = 767;
/** Largura do canvas do tablet no editor/pré-visualização. */
export const TABLET_WIDTH = 768;

/** Largura da área de conteúdo em cada dispositivo (px). */
export const DESKTOP_WIDTH = 980;
export const MOBILE_WIDTH = 360;

export interface Geometry {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type ShadowPreset = 'none' | 'sm' | 'md' | 'lg';

/**
 * Cores podem ser literais (#hex, rgba, transparent) ou referências ao tema
 * no formato "theme:primary". Fontes podem ser "theme:heading" / "theme:body".
 */
export interface ElementStyle {
  color?: string;
  background?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  lineHeight?: number;
  letterSpacing?: number;
  textTransform?: 'none' | 'uppercase';
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  padding?: number;
  shadow?: ShadowPreset;
  /** Desfoque do que está atrás (efeito vidro / glassmorfismo), em px. */
  backdropBlur?: number;
}

export interface Link {
  kind: 'page' | 'url' | 'email' | 'phone';
  pageId?: string;
  url?: string;
  newTab?: boolean;
}

export type ElementType =
  | 'heading'
  | 'text'
  | 'button'
  | 'image'
  | 'shape'
  | 'line'
  | 'video'
  | 'gallery'
  | 'menu'
  | 'form'
  | 'map'
  | 'embed'
  | 'social'
  | 'comments'
  | 'login'
  | 'themeToggle';

export interface SiteElement extends Geometry {
  id: string;
  type: ElementType;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  style: ElementStyle;
  link?: Link;
  /** Geometria no celular (presente quando o layout mobile da seção foi ajustado manualmente). */
  mobile?: Geometry;
  mobileHidden?: boolean;
  locked?: boolean;
}

export interface SectionBackground {
  color?: string;
  /** Degradê CSS (ex.: linear-gradient(...)), desenhado sob a imagem. */
  gradient?: string;
  image?: string;
  size?: 'cover' | 'contain' | 'auto';
  position?: string;
  overlay?: string;
  fixed?: boolean;
  /** Fundo usado quando o site está no modo escuro. */
  dark?: { color?: string; gradient?: string };
}

export type SectionKind = 'header' | 'footer' | 'body';

// ---------------- Layout em fluxo (containers estilo Elementor) ----------------

/** Largura de um item dentro do container pai. */
export type NodeWidth = 'auto' | 'fill' | number; // number = porcentagem

export interface ContainerProps {
  display: 'flex' | 'grid';
  direction: 'row' | 'column';
  justify: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around' | 'space-evenly';
  align: 'stretch' | 'flex-start' | 'center' | 'flex-end';
  gap: number;
  wrap: boolean;
  columns: number;
  paddingY: number;
  paddingX: number;
  minHeight?: number;
  /** Só no container raiz da seção: largura máxima do conteúdo (0 = largura total). */
  maxWidth?: number;
}

export interface NodeLayout {
  width?: NodeWidth;
  /** Altura fixa (px). Vazio = automática. */
  height?: number;
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
  hidden?: boolean;
}

/** Ajustes de um breakpoint menor (herdam do maior quando ausentes). */
export interface NodeOverride {
  props?: Partial<ContainerProps>;
  style?: Partial<ElementStyle>;
  layout?: Partial<NodeLayout>;
}

export type ContainerTag = 'div' | 'section' | 'article' | 'aside' | 'nav' | 'header' | 'footer';

export interface ContainerNode {
  id: string;
  kind: 'container';
  name?: string;
  tag?: ContainerTag;
  props: ContainerProps;
  style: ElementStyle;
  layout: NodeLayout;
  responsive?: { tablet?: NodeOverride; mobile?: NodeOverride };
  children: FlowNode[];
}

export interface WidgetNode {
  id: string;
  kind: 'widget';
  type: ElementType;
  name?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  style: ElementStyle;
  link?: Link;
  layout: NodeLayout;
  responsive?: { tablet?: NodeOverride; mobile?: NodeOverride };
}

export type FlowNode = ContainerNode | WidgetNode;

export interface Section {
  id: string;
  kind: SectionKind;
  /** 'free' = posicionamento livre (padrão antigo); 'flow' = containers. */
  layout?: 'free' | 'flow';
  /** Container raiz (somente seções em fluxo). */
  root?: ContainerNode;
  name: string;
  height: number;
  background: SectionBackground;
  elements: SiteElement[];
  /** Quando true, o layout mobile foi congelado e cada elemento tem `mobile`. */
  mobileFrozen?: boolean;
  mobileHeight?: number;
  mobileHidden?: boolean;
  /** Apenas cabeçalho: fica fixo no topo ao rolar. */
  sticky?: boolean;
}

export interface Page {
  id: string;
  name: string;
  slug: string;
  sections: Section[];
  seo: { title: string; description: string };
  hideFromMenu?: boolean;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  text: string;
  background: string;
  muted: string;
}

export interface Theme {
  colors: ThemeColors;
  /** Paleta do modo escuro (se ausente, é derivada automaticamente). */
  darkColors?: ThemeColors;
  fonts: { heading: string; body: string };
}

export interface Site {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  templateId?: string;
  theme: Theme;
  header: Section;
  footer: Section;
  pages: Page[];
  homePageId: string;
  settings: {
    language: string;
    favicon?: string;
    /** off = só claro; auto = segue o sistema do visitante; toggle = automático + botão para alternar. */
    darkMode?: 'off' | 'auto' | 'toggle';
  };
}

export interface SiteMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  templateId?: string;
}
