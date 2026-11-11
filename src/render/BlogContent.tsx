// Prévia dos componentes de blog com posts de exemplo.
// No HTML estático (sem servidor) eles são omitidos; no WordPress viram blocos dinâmicos.
import type { CSSProperties } from 'react';
import type { ElementType } from '../types';
import { SAMPLE_CATEGORIES, SAMPLE_CONTENT, SAMPLE_POSTS, SAMPLE_TAGS } from '../lib/samplePosts';
import { placeholderImage } from '../lib/images';
import type { ElementLike, RenderEnv } from './ElementContent';

export const BLOG_TYPES = new Set<ElementType>([
  'postFeed',
  'categories',
  'tagCloud',
  'archives',
  'search',
  'latestComments',
  'postTitle',
  'postContent',
  'postFeaturedImage',
  'postMeta',
  'postTags',
  'postNavigation',
  'postAuthor',
]);

const ti = (env: RenderEnv) => (env.mode === 'edit' ? -1 : undefined);

function WidgetTitle({ text }: { text?: string }) {
  return text ? <h3 className="wb-widget-title">{text}</h3> : null;
}

export function BlogContent({ el, env }: { el: ElementLike; env: RenderEnv }) {
  if (env.mode === 'export') return null;
  const p = el.props;
  const first = SAMPLE_POSTS[0];

  switch (el.type) {
    case 'postFeed': {
      const posts = SAMPLE_POSTS.slice(0, Math.max(1, Number(p.perPage) || 6));
      const grid = p.layout !== 'list';
      const style = { '--wb-cols': Math.max(1, Number(p.columns) || 3) } as CSSProperties;
      return (
        <div className={`wb-feed ${grid ? 'wb-feed-grid' : 'wb-feed-list'}`} style={style}>
          {posts.map((post) => (
            <article key={post.title} className="wb-post-card">
              {p.showImage && <img className="wb-post-img" src={post.image} alt="" />}
              <div className="wb-post-body">
                {p.showCategory && <span className="wb-post-cat">{post.category}</span>}
                <h3 className="wb-post-title">
                  <a href="#" tabIndex={ti(env)} onClick={(e) => e.preventDefault()}>
                    {post.title}
                  </a>
                </h3>
                {(p.showDate || p.showAuthor) && (
                  <div className="wb-post-meta">
                    {p.showDate && <time>{post.date}</time>}
                    {p.showAuthor && <span>por {post.author}</span>}
                  </div>
                )}
                {p.showExcerpt && <p className="wb-post-excerpt">{post.excerpt}</p>}
                {p.readMore && <span className="wb-read-more">{p.readMore} →</span>}
              </div>
            </article>
          ))}
          {p.pagination && (
            <nav className="wb-pagination" aria-label="Paginação">
              <span aria-current="page">1</span>
              <span>2</span>
              <span>3</span>
              <span>Próximos →</span>
            </nav>
          )}
        </div>
      );
    }
    case 'categories':
      return (
        <div className="wb-widget">
          <WidgetTitle text={p.title} />
          {p.dropdown ? (
            <select className="wb-select" tabIndex={ti(env)} aria-label="Categorias">
              {SAMPLE_CATEGORIES.map((c) => (
                <option key={c.name}>
                  {c.name}
                  {p.showCount ? ` (${c.count})` : ''}
                </option>
              ))}
            </select>
          ) : (
            <ul className="wb-list">
              {SAMPLE_CATEGORIES.map((c) => (
                <li key={c.name}>
                  <a href="#" tabIndex={ti(env)} onClick={(e) => e.preventDefault()}>
                    {c.name}
                  </a>
                  {p.showCount && <span className="wb-muted"> ({c.count})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    case 'tagCloud':
      return (
        <div className="wb-widget">
          <WidgetTitle text={p.title} />
          <div className="wb-tags">
            {SAMPLE_TAGS.map((t) => (
              <a key={t.name} href="#" tabIndex={ti(env)} onClick={(e) => e.preventDefault()} style={{ fontSize: `${0.8 + t.weight * 0.15}em` }}>
                {t.name}
              </a>
            ))}
          </div>
        </div>
      );
    case 'archives': {
      const months = ['novembro de 2026', 'outubro de 2026', 'setembro de 2026', 'agosto de 2026'];
      return (
        <div className="wb-widget">
          <WidgetTitle text={p.title} />
          {p.dropdown ? (
            <select className="wb-select" tabIndex={ti(env)} aria-label="Arquivos">
              {months.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          ) : (
            <ul className="wb-list">
              {months.map((m, i) => (
                <li key={m}>
                  <a href="#" tabIndex={ti(env)} onClick={(e) => e.preventDefault()}>
                    {m}
                  </a>
                  {p.showCount && <span className="wb-muted"> ({6 - i})</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case 'search':
      return (
        <form className="wb-search" role="search" onSubmit={(e) => e.preventDefault()}>
          <input type="search" placeholder={p.placeholder || 'Buscar…'} aria-label="Buscar" tabIndex={ti(env)} />
          <button type="submit" tabIndex={ti(env)}>
            {p.buttonText || 'Buscar'}
          </button>
        </form>
      );
    case 'latestComments':
      return (
        <div className="wb-widget">
          <WidgetTitle text={p.title} />
          <ul className="wb-list wb-latest-comments">
            {SAMPLE_POSTS.slice(0, Math.min(5, Number(p.count) || 5)).map((post, i) => (
              <li key={post.title}>
                <strong>{['Maria', 'João', 'Paula', 'Rafael', 'Bia'][i]}</strong> em <a href="#" tabIndex={ti(env)} onClick={(e) => e.preventDefault()}>{post.title}</a>
              </li>
            ))}
          </ul>
        </div>
      );
    case 'postTitle': {
      const Tag = `h${Math.min(3, Math.max(1, Number(p.level) || 1))}` as 'h1';
      return <Tag className="wb-heading">{first.title}</Tag>;
    }
    case 'postContent':
      return (
        <div className="wb-post-content">
          {SAMPLE_CONTENT.map((t) => (
            <p key={t}>{t}</p>
          ))}
        </div>
      );
    case 'postFeaturedImage':
      return <img className="wb-post-featured" src={first.image || placeholderImage()} alt="" />;
    case 'postMeta':
      return (
        <div className="wb-post-meta">
          {p.showDate && <time>{first.date}</time>}
          {p.showAuthor && <span>por {first.author}</span>}
          {p.showCategory && <span className="wb-post-cat">{first.category}</span>}
        </div>
      );
    case 'postTags':
      return (
        <div className="wb-tags">
          {first.tags.map((t) => (
            <a key={t} href="#" tabIndex={ti(env)} onClick={(e) => e.preventDefault()}>
              #{t}
            </a>
          ))}
        </div>
      );
    case 'postNavigation':
      return (
        <nav className="wb-post-nav" aria-label="Navegação entre posts">
          <a href="#" tabIndex={ti(env)} onClick={(e) => e.preventDefault()}>
            ← {SAMPLE_POSTS[1].title}
          </a>
          <a href="#" tabIndex={ti(env)} onClick={(e) => e.preventDefault()}>
            {SAMPLE_POSTS[2].title} →
          </a>
        </nav>
      );
    case 'postAuthor':
      return (
        <div className="wb-post-author">
          <span className="wb-avatar" aria-hidden>
            {first.author[0]}
          </span>
          <div>
            <strong>{first.author}</strong>
            {p.showBio && <p>Escreve sobre design, acessibilidade e tecnologia para pequenos negócios.</p>}
          </div>
        </div>
      );
    default:
      return null;
  }
}
