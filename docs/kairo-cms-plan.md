# Plano: Kairo CMS

CMS próprio em **Node.js**, semelhante ao WordPress, exportado pelo Website Builder Suite para quem **não quer usar WordPress**. Mesma licença do projeto (GPL-2.0-or-later), gratuito e open source.

## Objetivo

Exportar o site criado no app como uma aplicação Node completa: o site público (mesmo HTML/CSS dos temas) + um painel administrativo com os recursos base do WordPress.

## Recursos (paridade com o WordPress básico)

| WordPress | Kairo CMS |
| --- | --- |
| Posts (rascunho, publicado, agendado), categorias e tags | ✅ |
| Páginas (as do editor + novas criadas no painel) | ✅ |
| Biblioteca de mídia (upload, redimensionamento, texto alternativo) | ✅ |
| Comentários com moderação (aprovar, spam, lixeira) | ✅ |
| Usuários e papéis (administrador, editor, autor, colaborador, assinante) | ✅ |
| Login, recuperação de senha, perfil | ✅ |
| Menus (gerados das páginas do editor, editáveis) | ✅ |
| Formulários de contato → mensagens no painel + e-mail (SMTP) | ✅ |
| Configurações (título, descrição, página inicial, links permanentes, fuso) | ✅ |
| RSS, sitemap.xml, robots.txt, SEO por página/post | ✅ |
| Editor de posts | Editor de blocos simples (mesmos widgets do app) |
| Revisões de posts | ✅ (histórico) |
| Importação/exportação | Importar do WordPress (WXR) e backup JSON |
| Plugins/temas de terceiros | Fora do escopo inicial (temas vêm do app) |

## Arquitetura proposta (padrões a confirmar)

- **Servidor:** Node.js 20+ com Fastify (rápido, sem dependências pesadas).
- **Banco:** SQLite por padrão (arquivo único, zero configuração); opcional PostgreSQL/MySQL via mesma camada de dados.
- **Renderização pública:** reaproveita o `SiteRenderer` do app (SSR com React) — o site fica idêntico ao exportado; posts/arquivos usam templates gerados a partir do tema.
- **Painel:** aplicação React servida em `/admin` (mesmo visual e modo escuro do app).
- **Autenticação:** sessões com cookie httpOnly, senhas com Argon2/scrypt, CSRF, limite de tentativas.
- **Mídia:** pasta `uploads/` + miniaturas (sharp).
- **Distribuição:** o app exporta uma pasta pronta (`npm install && npm start`), com `Dockerfile` opcional; e o próprio app desktop pode rodar o CMS localmente para testes.

## Etapas

1. Núcleo: modelo de dados (posts, páginas, termos, mídia, usuários, comentários, opções) + API REST + autenticação.
2. Site público: SSR das páginas do editor, posts, arquivos, busca, RSS/sitemap.
3. Painel `/admin`: posts, páginas, mídia, comentários, usuários, menus, configurações.
4. Exportação pelo app ("Exportar → Kairo CMS") e execução local pelo app desktop.
5. Importador de WordPress (WXR) e documentação de hospedagem.
