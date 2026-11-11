// Cinco temas completos montados com containers (responsivos).
import type { Link, Page, Section, Site, Theme } from '../types';
import { newPage, newSite } from '../lib/siteOps';
import { placeholderImage } from '../lib/images';
import { blogPageSections, postTemplateSections } from './blog';
import { box, button, card, col, eyebrow, flowSection, form, gallery, ghostButton, grid, heading, headerSection, image, line, map, menu, row, social, text } from './kit';

type PageSpec = { name: string; slug: string; sections: (links: Links) => Section[]; role?: Page['role'] };
type Links = Record<string, Link>;

/** Monta o site: cria as páginas primeiro para que botões possam apontar para elas. */
function compose(siteName: string, templateId: string, theme: Theme, header: (l: Links) => Section, footer: (l: Links) => Section, pages: PageSpec[]): Site {
  const site = newSite(siteName, theme);
  site.templateId = templateId;
  const shells: Page[] = pages.map((p) => newPage(p.name, p.slug, []));
  const links: Links = Object.fromEntries(shells.map((p) => [p.slug, { kind: 'page', pageId: p.id } as Link]));
  shells.forEach((p, i) => {
    p.sections = pages[i].sections(links);
    if (pages[i].role) p.role = pages[i].role;
    if (pages[i].role === 'post') p.hideFromMenu = true;
  });
  site.pages = shells;
  site.homePageId = shells[0].id;
  site.header = header(links);
  site.footer = footer(links);
  return site;
}

const brand = (name: string, color = 'theme:text', size = 22) => heading(name, size, { color, fontWeight: 800, lineHeight: 1.2 }, 2, { responsive: {} });
const ph = (hue: number) => placeholderImage('', hue);

// ============ 1. Glassmorfismo escuro ("Aurora") ============

const GLASS_DARK = 'rgba(255,255,255,0.08)';
const glassDark = { background: GLASS_DARK, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)', borderRadius: 22, backdropBlur: 18, shadow: 'lg' as const };
const AURORA_BG =
  'radial-gradient(circle at 15% 20%, rgba(124,58,237,0.55), transparent 38%), radial-gradient(circle at 85% 25%, rgba(236,72,153,0.45), transparent 35%), radial-gradient(circle at 50% 95%, rgba(56,189,248,0.35), transparent 40%), linear-gradient(135deg, #0b0a1f, #1b1640 55%, #0f1b33)';

const auroraTheme: Theme = {
  colors: { primary: '#a78bfa', secondary: '#f472b6', accent: '#38bdf8', text: '#eef0ff', background: '#0b0a1f', muted: '#1b1640' },
  fonts: { heading: 'Space Grotesk', body: 'Inter' },
};

export function buildAurora(name: string): Site {
  const glassCard = (icon: string, title: string, body: string) =>
    card([text(icon, { fontSize: 30, lineHeight: 1 }), heading(title, 22, {}, 3), text(body, { fontSize: 15, color: 'rgba(238,240,255,0.75)' })], glassDark);
  return compose(
    name,
    'aurora',
    auroraTheme,
    (l) => headerSection(brand(name), menu({ color: '#eef0ff' }), button('Começar', { background: 'rgba(255,255,255,0.14)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', backdropBlur: 12 }, l.contato), { color: 'rgba(11,10,31,0.55)' }),
    () =>
      flowSection('Rodapé', [
        row([col([brand(name), text('Design com profundidade, transparência e luz.', { fontSize: 14, color: 'rgba(238,240,255,0.6)' })]), social('#eef0ff', 'right')], { align: 'center' }),
        line('rgba(255,255,255,0.12)'),
        text(`© ${new Date().getFullYear()} ${name}. Todos os direitos reservados.`, { fontSize: 13, color: 'rgba(238,240,255,0.5)' }),
      ], { color: '#0b0a1f' }, { paddingY: 56, gap: 24 }, 'footer'),
    [
      {
        name: 'Início',
        slug: 'inicio',
        sections: (l) => [
          flowSection(
            'Destaque',
            [
              card(
                [
                  eyebrow('Nova geração', { color: 'theme:accent', textAlign: 'center' }),
                  heading('Ideias que brilham através do vidro', 64, { textAlign: 'center' }, 1),
                  text('Uma experiência digital leve, moderna e acessível — criada sem escrever uma linha de código.', { fontSize: 19, textAlign: 'center', color: 'rgba(238,240,255,0.8)' }),
                  box({ direction: 'row', justify: 'center', gap: 14, wrap: true }, [button('Explorar', { background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }, l.sobre), ghostButton('Fale conosco', '#eef0ff', {}, l.contato)]),
                ],
                glassDark,
                56,
                { align: 'center', gap: 22 },
              ),
            ],
            { gradient: AURORA_BG },
            { paddingY: 140, maxWidth: 900 },
          ),
          flowSection(
            'Recursos',
            [
              box({ gap: 12, align: 'center' }, [eyebrow('Recursos', { color: 'theme:secondary' }), heading('Tudo em camadas', 44, { textAlign: 'center' })]),
              grid(3, [
                glassCard('✦', 'Visual translúcido', 'Cartões com desfoque de fundo, bordas suaves e brilho sutil.'),
                glassCard('◐', 'Responsivo de verdade', 'Colunas que se reorganizam no tablet e no celular automaticamente.'),
                glassCard('♿', 'Acessível', 'Contraste, foco visível e marcação semântica para todos os visitantes.'),
              ]),
            ],
            { gradient: AURORA_BG },
          ),
          flowSection(
            'Números',
            [
              grid(4, [
                ['+120', 'Projetos'],
                ['98%', 'Satisfação'],
                ['24h', 'Suporte'],
                ['0 R$', 'Para começar'],
              ].map(([n, label]) => card([heading(n, 40, { textAlign: 'center', color: 'theme:accent' }, 3), text(label, { textAlign: 'center', fontSize: 14, color: 'rgba(238,240,255,0.7)' })], glassDark, 26, { gap: 4 }))),
            ],
            { gradient: AURORA_BG },
            { paddingY: 60 },
          ),
          flowSection(
            'Chamada',
            [
              card(
                [heading('Pronto para atravessar o vidro?', 40, { textAlign: 'center' }), text('Crie a sua presença online em minutos.', { textAlign: 'center', color: 'rgba(238,240,255,0.75)' }), button('Começar agora', { background: 'linear-gradient(135deg,#7c3aed,#ec4899)', textAlign: 'center' }, l.contato)],
                glassDark,
                56,
                { align: 'center' },
              ),
            ],
            { gradient: AURORA_BG },
            { maxWidth: 820 },
          ),
        ],
      },
      {
        name: 'Sobre',
        slug: 'sobre',
        sections: () => [
          flowSection(
            'Sobre',
            [
              row([
                col([eyebrow('Sobre nós', { color: 'theme:accent' }), heading('Transparência é o nosso estilo', 48), text('Somos um estúdio criativo que une tecnologia e estética para criar experiências digitais memoráveis.', { color: 'rgba(238,240,255,0.8)' })]),
                col([image(ph(265), 'Equipe trabalhando em um estúdio criativo', 420, { borderRadius: 22 })]),
              ]),
            ],
            { gradient: AURORA_BG },
          ),
        ],
      },
      {
        name: 'Contato',
        slug: 'contato',
        sections: () => [
          flowSection(
            'Contato',
            [
              row([
                col([eyebrow('Contato', { color: 'theme:accent' }), heading('Vamos conversar', 48), text('Conte sua ideia e retornamos em até um dia útil.', { color: 'rgba(238,240,255,0.8)' })]),
                col([card([form([{ label: 'Nome', type: 'text', required: true }, { label: 'E-mail', type: 'email', required: true }, { label: 'Mensagem', type: 'textarea' }], 'Enviar mensagem', { color: '#eef0ff' }, '#7c3aed')], glassDark, 32)]),
              ], { align: 'flex-start' }),
            ],
            { gradient: AURORA_BG },
          ),
        ],
      },
    ],
  );
}

// ============ 2. Glassmorfismo claro ("Bruma") ============

const glassLight = { background: 'theme:background/45', borderWidth: 1, borderColor: 'theme:background/70', borderRadius: 24, backdropBlur: 16, shadow: 'md' as const };
const BRUMA_BG = 'radial-gradient(circle at 10% 10%, #ffd6e7 0, transparent 40%), radial-gradient(circle at 90% 20%, #c9e4ff 0, transparent 42%), radial-gradient(circle at 60% 90%, #d9f7e8 0, transparent 45%), linear-gradient(160deg, #fff5f0, #eef4ff)';
const BRUMA_BG_DARK = 'radial-gradient(circle at 10% 10%, rgba(255,143,171,0.22) 0, transparent 40%), radial-gradient(circle at 90% 20%, rgba(109,93,252,0.28) 0, transparent 42%), radial-gradient(circle at 60% 90%, rgba(72,187,140,0.16) 0, transparent 45%), linear-gradient(160deg, #15131f, #0f1424)';
const brumaBg = { gradient: BRUMA_BG, dark: { gradient: BRUMA_BG_DARK } };

const brumaTheme: Theme = {
  colors: { primary: '#6d5dfc', secondary: '#1f1d3a', accent: '#ff8fab', text: '#24223f', background: '#fbf9ff', muted: '#f1eefc' },
  fonts: { heading: 'DM Sans', body: 'DM Sans' },
};

export function buildBruma(name: string): Site {
  return compose(
    name,
    'bruma',
    brumaTheme,
    (l) => headerSection(brand(name), menu(), button('Agendar', { borderRadius: 999 }, l.contato), { color: 'theme:background/70' }),
    () =>
      flowSection('Rodapé', [row([text(`© ${new Date().getFullYear()} ${name}`, { fontSize: 14 }), social('theme:text', 'right')])], brumaBg, { paddingY: 40 }, 'footer'),
    [
      {
        name: 'Início',
        slug: 'inicio',
        sections: (l) => [
          flowSection(
            'Destaque',
            [
              row([
                col(
                  [
                    eyebrow('Bem-estar & estética', { color: 'theme:accent' }),
                    heading('Leveza para o seu dia a dia', 58, {}, 1),
                    text('Cuidado personalizado em um espaço pensado para você desacelerar.', { fontSize: 19 }),
                    box({ direction: 'row', gap: 12, wrap: true }, [button('Agendar horário', { borderRadius: 999 }, l.contato), ghostButton('Serviços', 'theme:primary', { borderRadius: 999 }, l.servicos)]),
                  ],
                  { gap: 22 },
                ),
                col([card([image(ph(330), 'Ambiente acolhedor do espaço', 380, { borderRadius: 18 })], glassLight, 14)]),
              ]),
            ],
            brumaBg,
            { paddingY: 110 },
          ),
          flowSection(
            'Serviços',
            [
              heading('Nossos serviços', 42, { textAlign: 'center' }),
              grid(3, [
                ['Massagem relaxante', '60 min · R$ 180'],
                ['Limpeza de pele', '50 min · R$ 150'],
                ['Aromaterapia', '40 min · R$ 120'],
              ].map(([t, d], i) => card([image(ph(300 + i * 30), t, 180, { borderRadius: 14 }), heading(t, 21, {}, 3), text(d, { fontSize: 15, color: 'theme:primary', fontWeight: 600 })], glassLight, 18))),
            ],
            brumaBg,
          ),
          flowSection(
            'Depoimento',
            [
              card(
                [text('“Saí renovada! O ambiente é lindo e o atendimento, impecável.”', { fontSize: 24, textAlign: 'center', fontStyle: 'italic', lineHeight: 1.5 }), text('— Ana Paula', { textAlign: 'center', fontWeight: 700 })],
                glassLight,
                48,
              ),
            ],
            brumaBg,
            { maxWidth: 820 },
          ),
        ],
      },
      { name: 'Serviços', slug: 'servicos', sections: () => [flowSection('Galeria', [heading('Nosso espaço', 42, { textAlign: 'center' }), card([gallery([0, 1, 2, 3, 4, 5].map((i) => ph(300 + i * 20)), 3, 10, 12)], glassLight, 16)], brumaBg)] },
      {
        name: 'Contato',
        slug: 'contato',
        sections: () => [
          flowSection('Agendamento', [
            row([
              col([heading('Agende seu horário', 44), text('Rua das Flores, 120 — Curitiba, PR\n(41) 99999-0000', { lineHeight: 1.9 })]),
              col([card([form([{ label: 'Nome', type: 'text', required: true }, { label: 'Telefone', type: 'tel', required: true }, { label: 'Data desejada', type: 'date' }, { label: 'Observações', type: 'textarea' }], 'Solicitar agendamento')], glassLight, 30)]),
            ], { align: 'flex-start' }),
          ], brumaBg),
        ],
      },
    ],
  );
}

// ============ 3. Restaurante ============

const restauranteTheme: Theme = {
  colors: { primary: '#b5462f', secondary: '#2a1a14', accent: '#e9b44c', text: '#2a1a14', background: '#fffaf3', muted: '#f5ead9' },
  fonts: { heading: 'Playfair Display', body: 'Lato' },
};

export function buildRestaurante(name: string): Site {
  const dish = (n: string, desc: string, price: string) =>
    box({ gap: 6 }, [box({ direction: 'row', justify: 'space-between', align: 'flex-end', gap: 12 }, [heading(n, 20, {}, 3), text(price, { fontWeight: 700, color: 'theme:primary', fontSize: 18 })]), text(desc, { fontSize: 15, color: '#6b5a50' })]);
  return compose(
    name,
    'restaurante',
    restauranteTheme,
    (l) => headerSection(brand(name, 'theme:text', 24), menu(), button('Reservar', {}, l.reservas), { color: 'theme:background' }),
    () =>
      flowSection('Rodapé', [
        grid(3, [
          col([brand(name, '#fffaf3'), text('Cozinha de raiz, ingredientes da estação.', { color: 'rgba(255,250,243,0.7)', fontSize: 15 })]),
          col([heading('Horários', 18, { color: '#fffaf3' }, 3), text('Ter a Sex: 12h–15h · 19h–23h\nSáb e Dom: 12h–23h', { color: 'rgba(255,250,243,0.7)', fontSize: 15 })]),
          col([heading('Siga-nos', 18, { color: '#fffaf3' }, 3), social('#fffaf3')]),
        ]),
      ], { color: 'theme:secondary' }, { paddingY: 64 }, 'footer'),
    [
      {
        name: 'Início',
        slug: 'inicio',
        sections: (l) => [
          flowSection(
            'Destaque',
            [
              box({ gap: 22, align: 'center' }, [
                eyebrow('Desde 1998', { color: 'theme:accent', textAlign: 'center' }),
                heading('Sabores que contam histórias', 66, { color: '#fffaf3', textAlign: 'center' }, 1),
                text('Pratos artesanais preparados com ingredientes frescos de produtores locais.', { color: 'rgba(255,250,243,0.85)', fontSize: 19, textAlign: 'center' }),
                box({ direction: 'row', gap: 12, justify: 'center', wrap: true }, [button('Ver cardápio', {}, l.cardapio), ghostButton('Reservar mesa', '#fffaf3', {}, l.reservas)]),
              ]),
            ],
            { gradient: 'radial-gradient(circle at 30% 20%, rgba(233,180,76,0.25), transparent 45%), linear-gradient(135deg, #4a2c20, #1f130e)' },
            { paddingY: 170, maxWidth: 860 },
          ),
          flowSection('Sobre', [
            row([
              col([image(ph(30), 'Chef preparando um prato na cozinha', 440, { borderRadius: 6 })]),
              col([eyebrow('Nossa história'), heading('Feito à mão, servido com afeto', 42), text('Começamos como uma pequena cantina de família e hoje recebemos amigos de todo o país, mantendo as receitas e o cuidado de sempre.'), ghostButton('Conheça o cardápio', 'theme:primary', {}, l.cardapio)], { gap: 20 }),
            ]),
          ]),
          flowSection('Destaques', [heading('Pratos da casa', 42, { textAlign: 'center' }), gallery([10, 25, 40, 15, 35, 5].map(ph), 3, 14, 6)], { color: 'theme:muted' }),
        ],
      },
      {
        name: 'Cardápio',
        slug: 'cardapio',
        sections: () => [
          flowSection('Cardápio', [
            box({ gap: 10, align: 'center' }, [eyebrow('Cardápio'), heading('Da cozinha para a mesa', 46, { textAlign: 'center' })]),
            row(
              [
                col([heading('Entradas', 26, { color: 'theme:primary' }, 2), dish('Bruschetta', 'Pão de fermentação natural, tomate e manjericão', 'R$ 32'), dish('Burrata', 'Com pesto de pistache e tomates assados', 'R$ 58'), dish('Carpaccio', 'Lâminas de filé, alcaparras e parmesão', 'R$ 49')], { gap: 22 }),
                col([heading('Principais', 26, { color: 'theme:primary' }, 2), dish('Risoto de cogumelos', 'Arbóreo, shiitake e trufa negra', 'R$ 89'), dish('Polvo grelhado', 'Batatas ao murro e páprica defumada', 'R$ 124'), dish('Ragu de costela', 'Pappardelle fresco e grana padano', 'R$ 92')], { gap: 22 }),
              ],
              { align: 'flex-start', gap: 60 },
            ),
          ]),
        ],
      },
      {
        name: 'Reservas',
        slug: 'reservas',
        sections: () => [
          flowSection('Reservas', [
            row([
              col([heading('Reserve sua mesa', 44), text('Rua do Sabor, 45 — Pinheiros, São Paulo\n(11) 3333-4444', { lineHeight: 1.9 }), map('Rua dos Pinheiros, São Paulo', 260, { borderRadius: 8 })]),
              col([card([form([{ label: 'Nome', type: 'text', required: true }, { label: 'Telefone', type: 'tel', required: true }, { label: 'Data', type: 'date', required: true }, { label: 'Número de pessoas', type: 'number' }], 'Solicitar reserva')], { background: '#ffffff', borderRadius: 8, shadow: 'md' }, 32)]),
            ], { align: 'flex-start' }),
          ], { color: 'theme:muted' }),
        ],
      },
    ],
  );
}

// ============ 4. Portfólio minimalista ============

const portfolioTheme: Theme = {
  colors: { primary: '#111111', secondary: '#111111', accent: '#ff4d00', text: '#111111', background: '#ffffff', muted: '#f3f3f1' },
  fonts: { heading: 'Space Grotesk', body: 'Inter' },
};

export function buildPortfolio(name: string): Site {
  const project = (title: string, cat: string, hue: number) =>
    box({ gap: 10 }, [image(ph(hue), `Projeto ${title}`, 320), box({ direction: 'row', justify: 'space-between' }, [heading(title, 20, {}, 3), text(cat, { fontSize: 14, color: '#777' })])]);
  return compose(
    name,
    'portfolio',
    portfolioTheme,
    () => headerSection(brand(name, 'theme:text', 20), menu({ fontSize: 14, fontWeight: 500 }, { activeColor: 'theme:accent' }), null, { color: 'theme:background' }),
    () => flowSection('Rodapé', [row([heading('Vamos criar algo juntos?', 32), text('ola@seuemail.com', { fontSize: 18, textAlign: 'right' })], { justify: 'space-between' })], { color: 'theme:muted' }, { paddingY: 64 }, 'footer'),
    [
      {
        name: 'Trabalhos',
        slug: 'trabalhos',
        sections: () => [
          flowSection('Apresentação', [heading('Designer de produto criando interfaces <span style="color:#ff4d00">simples</span> e acessíveis.', 60, { lineHeight: 1.1 }, 1), text('Disponível para projetos freelance a partir de março.', { fontSize: 18, color: '#666' })], {}, { paddingY: 130, gap: 24 }),
          flowSection('Projetos', [grid(2, [project('Fluxo', 'App financeiro', 10), project('Norte', 'Identidade visual', 200), project('Orla', 'E-commerce', 140), project('Pulso', 'Dashboard', 280)], 32)], {}, { paddingY: 40 }),
        ],
      },
      {
        name: 'Sobre',
        slug: 'sobre',
        sections: () => [
          flowSection('Sobre', [
            row([
              col([image(ph(40), 'Retrato do designer', 460)], {}, { layout: { width: 40 } }),
              col([heading('Sobre mim', 44), text('Há 10 anos ajudo empresas a transformar problemas complexos em produtos claros. Acredito que bom design é inclusivo por padrão.'), line('#dddddd'), text('Experiência: Nubank · Globo · Estúdio Próprio', { fontSize: 15, color: '#666' })], { gap: 20 }),
            ], { align: 'flex-start', gap: 60 }),
          ]),
        ],
      },
      { name: 'Blog', slug: 'blog', role: 'blog', sections: () => blogPageSections() },
      { name: 'Modelo de post', slug: 'modelo-post', role: 'post', sections: () => postTemplateSections() },
      { name: 'Contato', slug: 'contato', sections: () => [flowSection('Contato', [heading('Diga olá', 54, {}, 1), box({ gap: 0 }, [form([{ label: 'Nome', type: 'text', required: true }, { label: 'E-mail', type: 'email', required: true }, { label: 'Sobre o projeto', type: 'textarea' }], 'Enviar', {}, '#111111')], { layout: { width: 60 }, responsive: { mobile: { layout: { width: 100 } } } })])] },
    ],
  );
}

// ============ 5. Startup / SaaS ============

const saasTheme: Theme = {
  colors: { primary: '#4f46e5', secondary: '#0f172a', accent: '#22c55e', text: '#0f172a', background: '#ffffff', muted: '#f1f5f9' },
  fonts: { heading: 'Inter', body: 'Inter' },
};

export function buildSaas(name: string): Site {
  const feature = (icon: string, title: string, body: string) =>
    card([text(icon, { fontSize: 26, lineHeight: 1 }), heading(title, 19, {}, 3), text(body, { fontSize: 15, color: '#475569' })], { background: 'theme:background', borderRadius: 14, borderWidth: 1, borderColor: 'theme:muted' }, 26);
  const plan = (n: string, price: string, items: string, featured: boolean, l: Links) =>
    card(
      [
        heading(n, 20, { color: featured ? '#ffffff' : 'theme:text' }, 3),
        heading(`${price}<span style="font-size:16px;font-weight:400">/mês</span>`, 42, { color: featured ? '#ffffff' : 'theme:text' }, 4, { responsive: {} }),
        text(items, { fontSize: 15, lineHeight: 2, color: featured ? 'rgba(255,255,255,0.85)' : '#475569' }),
        button('Escolher plano', featured ? { background: '#ffffff', color: 'theme:primary', textAlign: 'justify' } : { textAlign: 'justify' }, l.contato),
      ],
      featured ? { background: 'linear-gradient(160deg,#4f46e5,#7c3aed)', borderRadius: 18, shadow: 'lg' } : { background: 'theme:background', borderRadius: 18, borderWidth: 1, borderColor: 'theme:muted' },
      32,
    );
  return compose(
    name,
    'saas',
    saasTheme,
    (l) => headerSection(brand(name), menu(), button('Teste grátis', { borderRadius: 8 }, l.contato), { color: 'theme:background/85' }),
    () =>
      flowSection('Rodapé', [
        row([col([brand(name, '#ffffff'), text('Software que trabalha por você.', { color: '#94a3b8', fontSize: 15 })]), social('#cbd5e1', 'right')]),
        text(`© ${new Date().getFullYear()} ${name}. Código aberto sob GPL.`, { color: '#64748b', fontSize: 13 }),
      ], { color: 'theme:secondary' }, { paddingY: 56, gap: 28 }, 'footer'),
    [
      {
        name: 'Início',
        slug: 'inicio',
        sections: (l) => [
          flowSection(
            'Destaque',
            [
              row([
                col(
                  [
                    text('● Novo: integração com WordPress', { fontSize: 13, fontWeight: 600, color: 'theme:primary', background: '#eef2ff', borderRadius: 999, padding: 8 }, { layout: { alignSelf: 'flex-start' } }),
                    heading('Automatize o trabalho repetitivo da sua equipe', 56, {}, 1),
                    text('Fluxos visuais, relatórios em tempo real e integrações prontas. Sem código e sem custo para começar.', { fontSize: 19, color: '#475569' }),
                    box({ direction: 'row', gap: 12, wrap: true }, [button('Começar grátis', {}, l.contato), ghostButton('Ver preços', 'theme:primary', {}, l.precos)]),
                  ],
                  { gap: 22 },
                ),
                col([image(ph(235), 'Painel do produto mostrando gráficos e tarefas', 420, { borderRadius: 16, shadow: 'lg' })]),
              ], { gap: 56 }),
            ],
            { gradient: 'linear-gradient(180deg,#eef2ff,#ffffff)', dark: { gradient: 'linear-gradient(180deg,#1a1b3a,#0f1117)' } },
            { paddingY: 110 },
          ),
          flowSection('Recursos', [
            box({ gap: 10, align: 'center' }, [eyebrow('Recursos'), heading('Tudo o que você precisa', 42, { textAlign: 'center' })]),
            grid(4, [
              feature('⚡', 'Automação', 'Gatilhos e ações sem escrever código.'),
              feature('📊', 'Relatórios', 'Indicadores atualizados em tempo real.'),
              feature('🔒', 'Segurança', 'Criptografia e controle de acesso.'),
              feature('🔌', 'Integrações', 'Conecte suas ferramentas favoritas.'),
            ], 20),
          ], { color: 'theme:muted' }),
        ],
      },
      {
        name: 'Preços',
        slug: 'precos',
        sections: (l) => [
          flowSection('Planos', [
            box({ gap: 10, align: 'center' }, [heading('Planos simples e transparentes', 44, { textAlign: 'center' }), text('Comece grátis. Mude quando quiser.', { textAlign: 'center', color: '#475569' })]),
            grid(3, [plan('Grátis', 'R$ 0', '✓ 3 projetos\n✓ 1 usuário\n✓ Suporte da comunidade', false, l), plan('Pro', 'R$ 49', '✓ Projetos ilimitados\n✓ 5 usuários\n✓ Suporte prioritário', true, l), plan('Empresa', 'R$ 199', '✓ Tudo do Pro\n✓ Usuários ilimitados\n✓ SSO e auditoria', false, l)]),
          ]),
        ],
      },
      { name: 'Blog', slug: 'blog', role: 'blog', sections: () => blogPageSections() },
      { name: 'Modelo de post', slug: 'modelo-post', role: 'post', sections: () => postTemplateSections() },
      { name: 'Contato', slug: 'contato', sections: () => [flowSection('Contato', [box({ gap: 24, align: 'stretch' }, [heading('Fale com a equipe', 44, { textAlign: 'center' }), card([form([{ label: 'Nome', type: 'text', required: true }, { label: 'E-mail de trabalho', type: 'email', required: true }, { label: 'Empresa', type: 'text' }, { label: 'Como podemos ajudar?', type: 'textarea' }], 'Enviar')], { background: 'theme:background', borderRadius: 16, shadow: 'md' }, 32)])], { color: 'theme:muted' }, { maxWidth: 640 })] },
    ],
  );
}
