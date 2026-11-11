// Modelo de dados do site. Tudo é JSON serializável (persistido no IndexedDB
// no navegador e, futuramente, em arquivos no app Electron).

export type DeviceMode = 'desktop' | 'mobile';

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
  | 'social';

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
  image?: string;
  size?: 'cover' | 'contain' | 'auto';
  position?: string;
  overlay?: string;
  fixed?: boolean;
}

export type SectionKind = 'header' | 'footer' | 'body';

export interface Section {
  id: string;
  kind: SectionKind;
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
  settings: { language: string; favicon?: string };
}

export interface SiteMeta {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  templateId?: string;
}
