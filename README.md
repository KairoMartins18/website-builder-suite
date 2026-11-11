# Website Builder Suite

Construtor de sites visual no estilo Wix: arraste e solte elementos livremente, ajuste a versão para celular e exporte o site como HTML estático.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # checa tipos + gera dist/
```

## Funcionalidades (fase 1 — criador e editor)

**Meus sites (painel)**: criar site (em branco ou a partir de modelo), abrir, visualizar, renomear, duplicar, excluir, exportar `.zip`, backup/importação `.json`. Miniaturas reais da página inicial.

**Editor**
- Canvas com posicionamento livre: arrastar, redimensionar (8 alças, Shift mantém proporção), linhas-guia de alinhamento (Alt desliga), arrastar elementos entre seções.
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

1. **Templates**: mais modelos de site completos por categoria (restaurante, portfólio, loja, serviços…) em `src/templates/`.
2. **App Electron standalone**: `storage.ts` já aceita `window.wbNative.storage` (salvar sites em arquivos), rotas por hash e `base: './'` no Vite funcionam via `file://`; a exportação poderá gravar direto numa pasta.
