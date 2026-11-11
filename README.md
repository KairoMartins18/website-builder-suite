# Website Builder Suite

Construtor de sites visual no estilo Wix, instalável no computador (Electron): arraste e solte elementos livremente, ajuste a versão para celular e exporte o site como HTML estático.

## Como rodar

```bash
npm install
npm run dev        # app desktop (Electron) com recarga automática
npm run dev:web    # só a interface no navegador: http://localhost:5173
npm start          # app desktop usando o build de produção
npm run dist       # gera o instalador do Windows em release/
```

No app desktop os sites ficam em arquivos JSON na pasta de dados do usuário
(`%APPDATA%/Website Builder Suite/sites` no Windows), excluir manda para a lixeira,
e "Exportar" grava o site direto numa pasta escolhida.

## Funcionalidades (fase 1 — criador e editor)

**Meus sites (painel)**: criar site (em branco ou a partir de 7 modelos, incluindo 2 de glassmorfismo), abrir, visualizar, renomear, duplicar, excluir, exportar `.zip`, backup/importação `.json`. Miniaturas reais da página inicial.

**Editor**
- **Containers estilo Elementor** (padrão nas novas seções): flex ou grade, direção, alinhamento, espaçamentos, larguras (auto / preencher / %), estruturas prontas (1–4 colunas, 30/70…), arrastar e soltar entre containers, árvore em "Camadas". Ajustes por dispositivo — **computador, tablet e celular** — herdando do maior para o menor.
- **Modo livre** (por seção): canvas com posicionamento livre: arrastar, redimensionar (8 alças, Shift mantém proporção), linhas-guia de alinhamento (Alt desliga), arrastar elementos entre seções.
- Elementos: título, texto, botão, imagem, galeria, vídeo (YouTube/Vimeo/mp4), forma, linha, menu, formulário de contato, mapa, redes sociais, HTML incorporado.
- Edição de texto inline (duplo clique) com negrito/itálico/sublinhado/link.
- Seções: presets prontos (destaque, sobre, serviços, preços, depoimento, contato…), altura ajustável, fundo com cor/imagem/camada/parallax. Cabeçalho e rodapé compartilhados por todas as páginas.
- Páginas: criar, renomear, duplicar, excluir, definir inicial, ocultar do menu, SEO (título/descrição).
- Tema global: 6 cores + fontes de títulos/corpo (Google Fonts); elementos que usam cores do tema são atualizados automaticamente.
- **Celular**: layout mobile automático (linhas → pilha, menu vira “hambúrguer”, cartões agrupados). Ao mover algo no modo celular, o layout da seção é “congelado” para ajuste manual — dá para restaurar o automático no painel da seção.
- Desfazer/refazer (Ctrl+Z / Ctrl+Y), copiar/colar/duplicar (Ctrl+C/V/D), setas para mover (Shift = 10px), Delete, salvamento automático.
- Pré-visualização com navegação entre páginas, desktop/celular.
- Exportação: um `.html` por página + `assets/` (imagens enviadas são extraídas para arquivos), responsivo via media query.

## Arquitetura

```
src/
  types.ts              Modelo de dados (Site → Páginas → Seções → Elementos)
  lib/
    storage.ts          Persistência (IndexedDB; interface pronta para o Electron)
    layout.ts           Layout mobile automático/congelado
    siteOps.ts          Fábricas e buscas no modelo
    theme.ts, fonts.ts  Tema, cores "theme:*", Google Fonts
    zip.ts, images.ts   ZIP sem dependências, otimização de imagens
  elements/registry.ts  Definição dos elementos (campos do inspector, presets do painel)
  render/               Renderização única usada no editor, pré-visualização e exportação
  store/editor.ts       Estado do editor (zustand + immer, histórico)
  editor/               Canvas, gestos, painéis, inspector, barra superior
  dashboard/            Tela "Meus sites"
  preview/              Pré-visualização
  templates/            Presets de seção e modelos de site
```

O mesmo componente `SiteRenderer` gera o canvas, a pré-visualização e o HTML final (via `renderToStaticMarkup`), então o que se vê no editor é o que é publicado.

## Próximas fases

Plano detalhado da integração com WordPress e dos recursos estilo Elementor: [docs/wordpress-plan.md](docs/wordpress-plan.md).
Próximo grande bloco — **Kairo CMS** (CMS próprio em Node, alternativa ao WordPress): [docs/kairo-cms-plan.md](docs/kairo-cms-plan.md).

1. **Templates**: mais modelos de site completos por categoria (restaurante, portfólio, loja, serviços…) em `src/templates/`.
2. ~~App Electron standalone~~ — feito (`electron/main.mjs`, `electron/preload.cjs`).

## WordPress

- **Exportar → Tema WordPress**: gera um tema de blocos (.zip) com `theme.json`, templates, cabeçalho/rodapé e padrões. Containers viram blocos nativos (Grupo, Título, Parágrafo, Botões, Imagem, Galeria, Navegação, Redes sociais, Comentários, Login…), editáveis em Aparência → Editor.
- **Exportar → Plugin**: plugin gratuito (`wordpress/plugin/website-builder-suite`) com formulário de contato funcional (e-mail + "Mensagens" no painel, anti-spam) e seções em modo livre com prévia no editor.
- Sem o plugin o tema continua exibindo o conteúdo; só os formulários dependem dele.

## App desktop (Electron)

- `electron/main.mjs`: janela, persistência (um JSON por site, escrita atômica), exportação para pasta, links externos no navegador padrão, salvamento antes de fechar.
- `electron/preload.cjs`: ponte `window.wbNative` (contextIsolation + sandbox).
- O build de produção inclui uma Content-Security-Policy que bloqueia scripts injetados em conteúdo do usuário.
- Limitação: no app, o elemento "HTML incorporado" não executa scripts na pré-visualização (a CSP vale para o iframe); no site exportado funciona normalmente.

## Licença

GPL-2.0-or-later — veja [LICENSE](LICENSE). Software livre e gratuito, a mesma licença do WordPress.
