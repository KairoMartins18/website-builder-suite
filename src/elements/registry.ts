import type { ElementStyle, ElementType, SiteElement } from '../types';
import { uid } from '../lib/id';
import { placeholderImage } from '../lib/images';

export type FieldKind = 'text' | 'textarea' | 'number' | 'select' | 'image' | 'toggle' | 'images' | 'color' | 'code' | 'formFields';

export interface FieldDef {
  key: string;
  label: string;
  kind: FieldKind;
  options?: { value: string | number; label: string }[];
  min?: number;
  max?: number;
  placeholder?: string;
}

export interface ElementDef {
  type: ElementType;
  label: string;
  fields: FieldDef[];
  /** Mostra controles de tipografia. */
  typography?: boolean;
  /** Mostra fundo, borda, cantos e sombra. */
  box?: boolean;
  linkable?: boolean;
  /** Edição de texto com duplo clique no canvas. */
  inlineText?: 'html' | 'label';
}

export const ELEMENTS: Record<ElementType, ElementDef> = {
  heading: {
    type: 'heading',
    label: 'Título',
    typography: true,
    box: true,
    linkable: true,
    inlineText: 'html',
    fields: [
      {
        key: 'level',
        label: 'Nível (SEO)',
        kind: 'select',
        options: [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `H${n}` })),
      },
    ],
  },
  text: { type: 'text', label: 'Texto', typography: true, box: true, linkable: true, inlineText: 'html', fields: [] },
  button: {
    type: 'button',
    label: 'Botão',
    typography: true,
    box: true,
    linkable: true,
    inlineText: 'label',
    fields: [{ key: 'label', label: 'Texto do botão', kind: 'text' }],
  },
  image: {
    type: 'image',
    label: 'Imagem',
    box: true,
    linkable: true,
    fields: [
      { key: 'src', label: 'Imagem', kind: 'image' },
      { key: 'alt', label: 'Texto alternativo', kind: 'text', placeholder: 'Descreva a imagem' },
      {
        key: 'fit',
        label: 'Ajuste',
        kind: 'select',
        options: [
          { value: 'cover', label: 'Preencher' },
          { value: 'contain', label: 'Ajustar' },
          { value: 'fill', label: 'Esticar' },
        ],
      },
    ],
  },
  shape: { type: 'shape', label: 'Forma', box: true, linkable: true, fields: [] },
  line: { type: 'line', label: 'Linha', fields: [] },
  video: {
    type: 'video',
    label: 'Vídeo',
    box: true,
    fields: [
      { key: 'url', label: 'URL (YouTube, Vimeo ou .mp4)', kind: 'text', placeholder: 'https://www.youtube.com/watch?v=...' },
      { key: 'autoplay', label: 'Reprodução automática (mudo)', kind: 'toggle' },
    ],
  },
  gallery: {
    type: 'gallery',
    label: 'Galeria',
    box: true,
    fields: [
      { key: 'images', label: 'Imagens', kind: 'images' },
      { key: 'columns', label: 'Colunas', kind: 'number', min: 1, max: 6 },
      { key: 'gap', label: 'Espaçamento', kind: 'number', min: 0, max: 60 },
      { key: 'radius', label: 'Cantos das imagens', kind: 'number', min: 0, max: 60 },
    ],
  },
  menu: {
    type: 'menu',
    label: 'Menu',
    typography: true,
    box: true,
    fields: [
      {
        key: 'direction',
        label: 'Direção',
        kind: 'select',
        options: [
          { value: 'row', label: 'Horizontal' },
          { value: 'column', label: 'Vertical' },
        ],
      },
      { key: 'gap', label: 'Espaçamento', kind: 'number', min: 0, max: 80 },
      { key: 'activeColor', label: 'Cor da página atual', kind: 'color' },
    ],
  },
  form: {
    type: 'form',
    label: 'Formulário',
    typography: true,
    box: true,
    fields: [
      { key: 'fields', label: 'Campos', kind: 'formFields' },
      { key: 'submitLabel', label: 'Texto do botão', kind: 'text' },
      { key: 'buttonColor', label: 'Cor do botão', kind: 'color' },
      { key: 'email', label: 'Enviar para (e-mail)', kind: 'text', placeholder: 'contato@seusite.com' },
    ],
  },
  map: {
    type: 'map',
    label: 'Mapa',
    box: true,
    fields: [
      { key: 'address', label: 'Endereço', kind: 'text' },
      { key: 'zoom', label: 'Zoom', kind: 'number', min: 1, max: 20 },
    ],
  },
  embed: {
    type: 'embed',
    label: 'HTML incorporado',
    box: true,
    fields: [{ key: 'html', label: 'Código HTML', kind: 'code' }],
  },
  social: {
    type: 'social',
    label: 'Redes sociais',
    fields: [
      { key: 'instagram', label: 'Instagram', kind: 'text', placeholder: 'https://instagram.com/...' },
      { key: 'facebook', label: 'Facebook', kind: 'text' },
      { key: 'x', label: 'X / Twitter', kind: 'text' },
      { key: 'linkedin', label: 'LinkedIn', kind: 'text' },
      { key: 'youtube', label: 'YouTube', kind: 'text' },
      { key: 'whatsapp', label: 'WhatsApp', kind: 'text', placeholder: 'https://wa.me/55...' },
      { key: 'size', label: 'Tamanho do ícone', kind: 'number', min: 16, max: 64 },
      { key: 'iconColor', label: 'Cor dos ícones', kind: 'color' },
    ],
  },
};

export type ElementSeed = Omit<SiteElement, 'id' | 'x' | 'y'> & { x?: number; y?: number };

export function makeElement(seed: ElementSeed): SiteElement {
  return { x: 0, y: 0, ...structuredClone(seed), id: uid('e') };
}

const text = (html: string, style: ElementStyle, w = 480, h = 60, level = 2): ElementSeed => ({
  type: 'heading',
  w,
  h,
  props: { html, level },
  style: { fontFamily: 'theme:heading', color: 'theme:text', fontWeight: 700, lineHeight: 1.2, ...style },
});

export interface AddPreset {
  label: string;
  /** Prévia simples no painel (texto/emoji). */
  icon: string;
  seed: () => ElementSeed;
}

export const ADD_CATEGORIES: { name: string; items: AddPreset[] }[] = [
  {
    name: 'Texto',
    items: [
      { label: 'Título grande', icon: 'H1', seed: () => text('Título do site', { fontSize: 52 }, 620, 70, 1) },
      { label: 'Título', icon: 'H2', seed: () => text('Título da seção', { fontSize: 36 }, 500, 50, 2) },
      { label: 'Subtítulo', icon: 'H3', seed: () => text('Subtítulo', { fontSize: 22, fontWeight: 600 }, 400, 34, 3) },
      {
        label: 'Parágrafo',
        icon: '¶',
        seed: () => ({
          type: 'text',
          w: 460,
          h: 96,
          props: {
            html: 'Este é um parágrafo. Clique duas vezes para editar e conte aos visitantes mais sobre você, seu negócio ou seus serviços.',
          },
          style: { fontFamily: 'theme:body', color: 'theme:text', fontSize: 16, lineHeight: 1.6 },
        }),
      },
    ],
  },
  {
    name: 'Botões',
    items: [
      {
        label: 'Botão principal',
        icon: '▭',
        seed: () => ({
          type: 'button',
          w: 180,
          h: 48,
          props: { label: 'Saiba mais' },
          style: { background: 'theme:primary', color: '#ffffff', fontFamily: 'theme:body', fontSize: 16, fontWeight: 600, borderRadius: 8 },
        }),
      },
      {
        label: 'Botão contorno',
        icon: '▢',
        seed: () => ({
          type: 'button',
          w: 180,
          h: 48,
          props: { label: 'Fale conosco' },
          style: { color: 'theme:primary', borderWidth: 2, borderColor: 'theme:primary', fontFamily: 'theme:body', fontSize: 16, fontWeight: 600, borderRadius: 8 },
        }),
      },
      {
        label: 'Botão pílula',
        icon: '⬭',
        seed: () => ({
          type: 'button',
          w: 200,
          h: 52,
          props: { label: 'Comece agora' },
          style: { background: 'theme:accent', color: 'theme:secondary', fontFamily: 'theme:body', fontSize: 16, fontWeight: 700, borderRadius: 999 },
        }),
      },
    ],
  },
  {
    name: 'Mídia',
    items: [
      { label: 'Imagem', icon: '🖼', seed: () => ({ type: 'image', w: 400, h: 280, props: { src: placeholderImage(), alt: '', fit: 'cover' }, style: {} }) },
      {
        label: 'Galeria',
        icon: '▦',
        seed: () => ({
          type: 'gallery',
          w: 640,
          h: 320,
          props: {
            images: [0, 1, 2, 3, 4, 5].map((i) => ({ src: placeholderImage('', 190 + i * 25), alt: '' })),
            columns: 3,
            gap: 8,
            radius: 6,
          },
          style: {},
        }),
      },
      { label: 'Vídeo', icon: '▶', seed: () => ({ type: 'video', w: 560, h: 315, props: { url: '', autoplay: false }, style: {} }) },
    ],
  },
  {
    name: 'Formas',
    items: [
      { label: 'Retângulo', icon: '■', seed: () => ({ type: 'shape', w: 240, h: 160, props: {}, style: { background: 'theme:muted', borderRadius: 0 } }) },
      { label: 'Cartão', icon: '▣', seed: () => ({ type: 'shape', w: 300, h: 220, props: {}, style: { background: '#ffffff', borderRadius: 14, shadow: 'md' } }) },
      { label: 'Círculo', icon: '●', seed: () => ({ type: 'shape', w: 160, h: 160, props: {}, style: { background: 'theme:primary', borderRadius: 9999 } }) },
      { label: 'Linha', icon: '—', seed: () => ({ type: 'line', w: 300, h: 20, props: {}, style: { borderWidth: 2, borderColor: 'theme:text', borderStyle: 'solid' } }) },
    ],
  },
  {
    name: 'Navegação e contato',
    items: [
      {
        label: 'Menu',
        icon: '☰',
        seed: () => ({
          type: 'menu',
          w: 420,
          h: 40,
          props: { direction: 'row', gap: 28, activeColor: 'theme:primary' },
          style: { color: 'theme:text', fontFamily: 'theme:body', fontSize: 15, fontWeight: 500, textAlign: 'right' },
        }),
      },
      {
        label: 'Formulário de contato',
        icon: '✉',
        seed: () => ({
          type: 'form',
          w: 420,
          h: 330,
          props: {
            fields: [
              { label: 'Nome', type: 'text', required: true },
              { label: 'E-mail', type: 'email', required: true },
              { label: 'Mensagem', type: 'textarea', required: false },
            ],
            submitLabel: 'Enviar',
            buttonColor: 'theme:primary',
            email: '',
          },
          style: { fontFamily: 'theme:body', fontSize: 15, color: 'theme:text' },
        }),
      },
      {
        label: 'Redes sociais',
        icon: '◎',
        seed: () => ({
          type: 'social',
          w: 180,
          h: 36,
          props: { instagram: '#', facebook: '#', linkedin: '#', size: 28, iconColor: 'theme:text' },
          style: { textAlign: 'left' },
        }),
      },
      { label: 'Mapa', icon: '⌖', seed: () => ({ type: 'map', w: 480, h: 300, props: { address: 'Avenida Paulista, São Paulo', zoom: 15 }, style: {} }) },
    ],
  },
  {
    name: 'Avançado',
    items: [
      {
        label: 'HTML incorporado',
        icon: '</>',
        seed: () => ({
          type: 'embed',
          w: 400,
          h: 200,
          props: { html: '<div style="font-family:sans-serif;padding:20px">Seu código HTML aqui</div>' },
          style: {},
        }),
      },
    ],
  },
];
