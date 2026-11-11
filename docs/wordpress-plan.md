# Plano: WordPress + recursos estilo Elementor

Objetivo: ferramenta **simples, low-code, gratuita e open source (GPL-2.0-or-later)** para criar e editar sites WordPress, no computador (app desktop).

## Decisões

| Tema | Decisão |
| --- | --- |
| Integração | **Tema de blocos exportável + plugin próprio** (open source) |
| Layout | **Containers flex/grid estilo Elementor + modo livre** (estilo Wix) por seção |
| Licença | **GPL-2.0-or-later** (mesma do WordPress; exigida no WordPress.org) |

## Etapa 1 — Modelo de layout v2 (containers) ✅ concluída

- `Section.layout: 'free' | 'flow'`. `free` = modelo atual (coordenadas absolutas). `flow` = árvore de nós.
- Nó **container**: direção, alinhamento, distribuição, `gap`, quebra, grade (colunas), largura (encaixotado/total), altura mínima, espaçamentos, fundo, borda e sombra.
- Nó **widget**: os elementos atuais sem `x/y`, com largura (auto / 100% / %) e alinhamento próprio.
- **Breakpoints**: computador, tablet (≤1024px) e celular (≤767px), com ajustes por breakpoint (tamanho de fonte, direção do container, espaçamentos, ocultar). Mesmo princípio do Elementor: o valor herda do breakpoint maior.
- Editor: arrastar para reordenar e soltar dentro de containers (indicadores de posição), painel "Navegador" (árvore), atalhos para estruturas prontas (1, 2, 3, 4 colunas, 30/70…).
- Migração: sites existentes continuam com `layout: 'free'`.
- Implementado em `src/lib/flow.ts` (modelo, cascata de breakpoints, CSS), `src/editor/FlowEditor.tsx` + `flowDnd.ts` (canvas e arrastar), `src/editor/inspector/FlowInspector.tsx`.
- Novas seções em branco usam containers por padrão; o modo livre continua disponível no painel "Seções".
- Temas com containers: Aurora e Bruma (glassmorfismo), Restaurante, Portfólio minimalista, Startup/SaaS (`src/templates/themes.ts`).
- Acessibilidade nos sites gerados: link "Pular para o conteúdo", foco visível, `aria-current` no menu, `aria-expanded` no hambúrguer, campos com `autocomplete`, tags semânticas por container, aviso de texto alternativo em imagens, respeito a `prefers-reduced-motion`.

## Etapa 2 — Exportar tema de blocos (.zip) ✅ concluída

Estrutura gerada:

```
meu-tema/
  style.css            cabeçalho do tema (nome, versão, "License: GPL-2.0-or-later")
  theme.json           paleta (cores do tema), fontes, larguras de layout
  functions.php        carrega CSS/JS, recomenda o plugin
  templates/           index.html, front-page.html, page.html, page-{slug}.html, single.html, archive.html
  parts/               header.html, footer.html
  patterns/            um padrão PHP por página (permite URLs de imagens via get_theme_file_uri)
  assets/              imagens, fontes, CSS base, JS do menu
  screenshot.png       miniatura gerada pelo próprio renderizador
```

Mapeamento para blocos nativos (editáveis no WordPress):

| Nosso elemento | Bloco WordPress |
| --- | --- |
| Container | `core/group` (flex/grid) ou `core/columns` |
| Título / Texto | `core/heading` / `core/paragraph` |
| Botão | `core/buttons` + `core/button` |
| Imagem / Galeria | `core/image` / `core/gallery` |
| Vídeo | `core/embed` (YouTube/Vimeo) ou `core/video` |
| Linha | `core/separator` |
| Menu | `core/navigation` (com submenu responsivo nativo) |
| Redes sociais | `core/social-links` |
| Formulário, mapa, seção em modo livre | blocos do plugin (`wbs/*`) com HTML salvo como fallback |

## Etapa 3 — Plugin "Website Builder Suite" (WordPress) ✅ concluída

- Blocos `wbs/free-section`, `wbs/form`, `wbs/map`: salvam o HTML renderizado. **Se o plugin for desativado, o site continua exibindo o conteúdo.**
- Formulário funcional e gratuito: envio por `wp_mail` + registro das mensagens no painel do WordPress.
- Carrega o CSS base e o JS do menu hambúrguer; botão "Editar no Website Builder Suite".
- Futuro: sincronizar com um site WordPress existente via REST API e senhas de aplicativo.

## Etapa 4 — Recursos estilo Elementor

- Estilos globais (kit): tipografia por nível (H1–H6, corpo, botão), cores globais (já existem).
- Novos widgets: ícone, lista de ícones, caixa de ícone, depoimento, contador, abas, acordeão, carrossel, espaçador e botão com ícone.
- Estados de hover, animações de entrada e efeitos de movimento simples.
- Conteúdo dinâmico para temas: título do site, título/conteúdo do post, loop de posts (`core/query`), modelos de post único e arquivo.
- Biblioteca de seções/páginas salvas e reutilizáveis (“templates” do usuário).

## Validação (WordPress real via WordPress Playground)

- Tema e plugin instalados e ativados; páginas e página inicial criadas na ativação; menu com links corretos.
- Sem erros de PHP; **zero blocos inválidos** no editor do site (marcação idêntica à do WordPress).
- Formulário envia e grava em "Mensagens"; comentários e login nativos funcionando; modo escuro com botão.
- Tema de modo livre (bloco `wbs/free-section`) com prévia no editor; sem rolagem horizontal no celular.
- Código: `src/wordpress/` (exportador) e `wordpress/plugin/website-builder-suite/` (plugin, PHP + JS sem build).
