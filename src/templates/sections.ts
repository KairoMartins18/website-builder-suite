import type { ElementStyle, Link, Section, SectionBackground } from '../types';
import { makeElement, type ElementSeed } from '../elements/registry';
import { newSection } from '../lib/siteOps';
import { placeholderImage } from '../lib/images';

// Pequena DSL para montar seções com elementos posicionados.
type Seed = ElementSeed & { x: number; y: number };

export const H = (html: string, x: number, y: number, w: number, h: number, size: number, style: ElementStyle = {}, level = 2): Seed => ({
  type: 'heading',
  x,
  y,
  w,
  h,
  props: { html, level },
  style: { fontFamily: 'theme:heading', color: 'theme:text', fontSize: size, fontWeight: 700, lineHeight: 1.2, ...style },
});

export const P = (html: string, x: number, y: number, w: number, h: number, style: ElementStyle = {}): Seed => ({
  type: 'text',
  x,
  y,
  w,
  h,
  props: { html },
  style: { fontFamily: 'theme:body', color: 'theme:text', fontSize: 16, lineHeight: 1.6, ...style },
});

export const Eyebrow = (text: string, x: number, y: number, w: number, style: ElementStyle = {}): Seed =>
  P(text, x, y, w, 24, { fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'theme:primary', ...style });

export const B = (label: string, x: number, y: number, w = 180, h = 50, style: ElementStyle = {}, link?: Link): Seed => ({
  type: 'button',
  x,
  y,
  w,
  h,
  props: { label },
  style: { background: 'theme:primary', color: '#ffffff', fontFamily: 'theme:body', fontSize: 16, fontWeight: 600, borderRadius: 8, ...style },
  link,
});

export const BOutline = (label: string, x: number, y: number, w = 180, h = 50, color = 'theme:primary', link?: Link): Seed =>
  B(label, x, y, w, h, { background: undefined, color, borderWidth: 2, borderColor: color }, link);

export const Img = (x: number, y: number, w: number, h: number, src = placeholderImage(), style: ElementStyle = {}, alt = ''): Seed => ({
  type: 'image',
  x,
  y,
  w,
  h,
  props: { src, alt, fit: 'cover' },
  style,
});

export const Box = (x: number, y: number, w: number, h: number, style: ElementStyle): Seed => ({ type: 'shape', x, y, w, h, props: {}, style });

export function section(name: string, height: number, seeds: Seed[], background: SectionBackground = {}): Section {
  return newSection('body', name, height, { background, elements: seeds.map(makeElement) });
}

export interface SectionPreset {
  id: string;
  name: string;
  description: string;
  build: () => Section;
}

const LOREM = 'Conte aos visitantes o que torna seu trabalho especial. Use este espaço para apresentar sua história, seus valores e o que você oferece.';

export const SECTION_PRESETS: SectionPreset[] = [
  { id: 'blank', name: 'Em branco', description: 'Seção vazia para montar do zero', build: () => section('Nova seção', 500, []) },
  {
    id: 'hero-center',
    name: 'Destaque central',
    description: 'Título grande, texto e botões centralizados',
    build: () =>
      section(
        'Destaque',
        620,
        [
          Eyebrow('Bem-vindo', 290, 160, 400, { textAlign: 'center', color: 'theme:accent' }),
          H('Uma frase de impacto sobre o seu negócio', 90, 200, 800, 140, 56, { color: '#ffffff', textAlign: 'center' }, 1),
          P('Uma breve descrição que convida o visitante a conhecer mais sobre o que você faz.', 190, 360, 600, 60, { color: 'rgba(255,255,255,0.8)', textAlign: 'center', fontSize: 18 }),
          B('Começar agora', 300, 450, 180, 52),
          BOutline('Saiba mais', 500, 450, 180, 52, '#ffffff'),
        ],
        { color: 'theme:secondary' },
      ),
  },
  {
    id: 'hero-image',
    name: 'Destaque com imagem',
    description: 'Texto à esquerda e imagem à direita',
    build: () =>
      section(
        'Destaque',
        600,
        [
          Eyebrow('Novidade', 0, 150, 300),
          H('Transforme suas ideias em realidade', 0, 185, 470, 130, 48, {}, 1),
          P('Explique em poucas palavras o valor que você entrega e por que as pessoas devem escolher você.', 0, 335, 430, 80, { fontSize: 18 }),
          B('Fale conosco', 0, 440),
          Img(530, 80, 450, 440, placeholderImage('', 200), { borderRadius: 16 }),
        ],
        { color: 'theme:muted' },
      ),
  },
  {
    id: 'about',
    name: 'Sobre',
    description: 'Imagem e texto sobre você ou sua empresa',
    build: () =>
      section('Sobre', 560, [
        Img(0, 80, 440, 400, placeholderImage('', 30), { borderRadius: 12 }),
        Eyebrow('Sobre nós', 500, 110, 300),
        H('Nossa história', 500, 145, 480, 50, 38),
        P(`${LOREM}\n\nMostre quem está por trás do projeto e gere confiança com quem chega ao seu site.`, 500, 215, 460, 170),
        BOutline('Conheça a equipe', 500, 410, 200, 50),
      ]),
  },
  {
    id: 'services',
    name: 'Serviços (3 colunas)',
    description: 'Três cartões com título e descrição',
    build: () => {
      const cards = [
        ['Consultoria', 'Ajudamos você a definir a melhor estratégia para crescer com segurança.'],
        ['Projeto', 'Planejamento e execução completos, do primeiro esboço à entrega final.'],
        ['Suporte', 'Acompanhamento contínuo para garantir resultados duradouros.'],
      ].flatMap(([title, text], i) => {
        const x = i * 340;
        return [
          Box(x, 220, 300, 320, { background: 'theme:background', borderRadius: 14, shadow: 'sm' }),
          Box(x + 30, 250, 56, 56, { background: 'theme:primary', borderRadius: 9999, opacity: 0.9 }),
          H(title, x + 30, 330, 240, 34, 22, {}, 3),
          P(text, x + 30, 375, 240, 120, { fontSize: 15 }),
        ];
      });
      return section(
        'Serviços',
        620,
        [
          H('O que fazemos', 190, 70, 600, 50, 38, { textAlign: 'center' }),
          P('Soluções pensadas para cada etapa do seu projeto.', 240, 130, 500, 50, { textAlign: 'center', fontSize: 18 }),
          ...cards,
        ],
        { color: 'theme:muted' },
      );
    },
  },
  {
    id: 'stats',
    name: 'Números',
    description: 'Quatro indicadores em destaque',
    build: () =>
      section(
        'Números',
        300,
        [
          ['+250', 'Clientes atendidos'],
          ['12', 'Anos de experiência'],
          ['98%', 'Satisfação'],
          ['24h', 'Tempo de resposta'],
        ].flatMap(([n, label], i) => [
          H(n, i * 250, 80, 230, 70, 56, { textAlign: 'center', color: 'theme:primary' }, 3),
          P(label, i * 250, 160, 230, 30, { textAlign: 'center', fontSize: 16 }),
        ]),
      ),
  },
  {
    id: 'gallery',
    name: 'Galeria',
    description: 'Título e grade de imagens',
    build: () =>
      section('Galeria', 640, [
        H('Galeria', 190, 60, 600, 50, 38, { textAlign: 'center' }),
        {
          type: 'gallery',
          x: 0,
          y: 140,
          w: 980,
          h: 440,
          props: { images: [0, 1, 2, 3, 4, 5].map((i) => ({ src: placeholderImage('', 180 + i * 30), alt: '' })), columns: 3, gap: 12, radius: 8 },
          style: {},
        },
      ]),
  },
  {
    id: 'testimonial',
    name: 'Depoimento',
    description: 'Citação de um cliente em destaque',
    build: () =>
      section(
        'Depoimento',
        460,
        [
          H('“', 440, 30, 100, 90, 110, { textAlign: 'center', color: 'theme:accent', lineHeight: 1 }),
          P('O atendimento foi excelente do início ao fim. Superou todas as minhas expectativas e recomendo a todos!', 140, 130, 700, 120, {
            fontFamily: 'theme:heading',
            fontSize: 24,
            textAlign: 'center',
            fontStyle: 'italic',
            lineHeight: 1.5,
          }),
          Img(458, 280, 64, 64, placeholderImage('', 20), { borderRadius: 9999 }),
          P('Maria Souza', 340, 356, 300, 26, { textAlign: 'center', fontWeight: 700 }),
          P('Cliente desde 2021', 340, 382, 300, 24, { textAlign: 'center', fontSize: 14, opacity: 0.7 }),
        ],
        { color: 'theme:muted' },
      ),
  },
  {
    id: 'pricing',
    name: 'Preços (3 planos)',
    description: 'Tabela de planos com destaque',
    build: () => {
      const plans: [string, string, string, boolean][] = [
        ['Básico', 'R$ 49', 'Ideal para começar\n\n✓ Item incluso\n✓ Item incluso\n✓ Suporte por e-mail', false],
        ['Profissional', 'R$ 99', 'O mais escolhido\n\n✓ Tudo do Básico\n✓ Recursos avançados\n✓ Suporte prioritário', true],
        ['Empresa', 'R$ 199', 'Para equipes\n\n✓ Tudo do Profissional\n✓ Usuários ilimitados\n✓ Gerente dedicado', false],
      ];
      const els = plans.flatMap(([name, price, text, featured], i) => {
        const x = i * 340;
        const fg = featured ? '#ffffff' : 'theme:text';
        return [
          Box(x, 170, 300, 440, featured ? { background: 'theme:primary', borderRadius: 16, shadow: 'lg' } : { background: 'theme:background', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' }),
          H(name, x + 30, 200, 240, 30, 20, { color: fg }, 3),
          H(`${price}<span style="font-size:16px;font-weight:400">/mês</span>`, x + 30, 240, 240, 60, 44, { color: fg }, 4),
          P(text, x + 30, 315, 240, 190, { color: fg, fontSize: 15 }),
          B('Assinar', x + 30, 530, 240, 50, featured ? { background: '#ffffff', color: 'theme:primary' } : {}),
        ];
      });
      return section('Preços', 680, [H('Planos e preços', 190, 60, 600, 50, 38, { textAlign: 'center' }), P('Escolha o plano ideal para você.', 240, 115, 500, 30, { textAlign: 'center' }), ...els]);
    },
  },
  {
    id: 'cta',
    name: 'Chamada para ação',
    description: 'Faixa colorida com título e botão',
    build: () =>
      section(
        'Chamada',
        340,
        [
          H('Pronto para começar?', 140, 90, 700, 50, 40, { color: '#ffffff', textAlign: 'center' }),
          P('Entre em contato hoje mesmo e receba uma proposta sem compromisso.', 190, 150, 600, 50, { color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontSize: 18 }),
          B('Solicitar orçamento', 390, 230, 200, 52, { background: '#ffffff', color: 'theme:primary' }),
        ],
        { color: 'theme:primary' },
      ),
  },
  {
    id: 'contact',
    name: 'Contato',
    description: 'Informações de contato e formulário',
    build: () =>
      section('Contato', 600, [
        Eyebrow('Contato', 0, 90, 300),
        H('Vamos conversar', 0, 125, 440, 50, 38),
        P('Preencha o formulário ou fale conosco pelos canais abaixo. Respondemos em até 24 horas.', 0, 190, 420, 80),
        P('📍 Rua Exemplo, 123 — São Paulo, SP\n📞 (11) 99999-9999\n✉ contato@seusite.com', 0, 290, 420, 110, { lineHeight: 2 }),
        {
          type: 'form',
          x: 520,
          y: 80,
          w: 460,
          h: 440,
          props: {
            fields: [
              { label: 'Nome', type: 'text', required: true },
              { label: 'E-mail', type: 'email', required: true },
              { label: 'Telefone', type: 'tel', required: false },
              { label: 'Mensagem', type: 'textarea', required: false },
            ],
            submitLabel: 'Enviar mensagem',
            buttonColor: 'theme:primary',
            email: '',
          },
          style: { fontFamily: 'theme:body', fontSize: 15, color: 'theme:text' },
        },
      ]),
  },
  {
    id: 'map',
    name: 'Localização',
    description: 'Título e mapa',
    build: () =>
      section('Localização', 520, [
        H('Onde estamos', 190, 60, 600, 50, 36, { textAlign: 'center' }),
        { type: 'map', x: 0, y: 140, w: 980, h: 320, props: { address: 'Avenida Paulista, 1000, São Paulo', zoom: 15 }, style: { borderRadius: 12 } },
      ]),
  },
];

export function headerPreset(brand = 'Minha Marca', ctaLink?: Link): Section {
  return newSection('header', 'Cabeçalho', 90, {
    background: { color: 'theme:background' },
    elements: [
      H(brand, 0, 25, 300, 40, 24, { fontWeight: 800 }, 2),
      {
        type: 'menu',
        x: 360,
        y: 25,
        w: 420,
        h: 40,
        props: { direction: 'row', gap: 28, activeColor: 'theme:primary' },
        style: { color: 'theme:text', fontFamily: 'theme:body', fontSize: 15, fontWeight: 500, textAlign: 'right' },
      } as Seed,
      B('Contato', 820, 21, 160, 48, {}, ctaLink),
    ].map(makeElement),
  });
}

export function footerPreset(brand = 'Minha Marca'): Section {
  return newSection('footer', 'Rodapé', 160, {
    background: { color: 'theme:secondary' },
    elements: [
      H(brand, 0, 40, 300, 34, 22, { color: '#ffffff', fontWeight: 800 }),
      P(`© ${new Date().getFullYear()} ${brand}. Todos os direitos reservados.`, 0, 90, 460, 26, { color: 'rgba(255,255,255,0.65)', fontSize: 14 }),
      {
        type: 'social',
        x: 780,
        y: 60,
        w: 200,
        h: 32,
        props: { instagram: '#', facebook: '#', linkedin: '#', size: 26, iconColor: '#ffffff' },
        style: { textAlign: 'right' },
      } as Seed,
    ].map(makeElement),
  });
}
