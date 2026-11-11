import type { AnchorHTMLAttributes, CSSProperties, ReactNode } from 'react';
import type { Link, Site, SiteElement, WidgetNode } from '../types';

/** O suficiente para desenhar o conteúdo: elemento livre ou widget de container. */
export type ElementLike = Pick<SiteElement, 'id' | 'type' | 'props' | 'style' | 'link'>;
import { elementCss, resolveColor } from '../lib/theme';
import { ELEMENTS } from '../elements/registry';

export interface RenderEnv {
  site: Site;
  pageId: string;
  /** live = pré-visualização, edit = canvas do editor, thumb = miniatura, export = HTML final */
  mode: 'live' | 'edit' | 'thumb' | 'export';
  hrefForPage: (pageId: string) => string;
}

export function videoSource(url: string, autoplay: boolean): { kind: 'iframe' | 'video'; src: string } | null {
  if (!url) return null;
  const yt = url.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  const ap = autoplay ? 'autoplay=1&mute=1' : '';
  if (yt) return { kind: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}?rel=0${ap ? '&' + ap : ''}` };
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { kind: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}${autoplay ? '?autoplay=1&muted=1' : ''}` };
  if (/\.(mp4|webm|ogg)(\?|$)/i.test(url) || url.startsWith('data:video/')) return { kind: 'video', src: url };
  return null;
}

export function linkProps(link: Link | undefined, env: RenderEnv): AnchorHTMLAttributes<HTMLAnchorElement> | null {
  if (!link) return null;
  switch (link.kind) {
    case 'page':
      return link.pageId && env.site.pages.some((p) => p.id === link.pageId) ? { href: env.hrefForPage(link.pageId) } : null;
    case 'url':
      if (!link.url) return null;
      return link.newTab ? { href: link.url, target: '_blank', rel: 'noopener noreferrer' } : { href: link.url };
    case 'email':
      return link.url ? { href: `mailto:${link.url}` } : null;
    case 'phone':
      return link.url ? { href: `tel:${link.url.replace(/[^\d+]/g, '')}` } : null;
  }
}

const SOCIAL_ICONS: Record<string, ReactNode> = {
  instagram: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.3" cy="6.7" r="0.6" fill="currentColor" />
    </>
  ),
  facebook: <path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3h2v9h3v-9h2.6l.4-3h-3V7a1 1 0 0 1 1-1h2z" />,
  x: <path d="M4 4l16 16M20 4L4 20" />,
  linkedin: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5V17M8 7.5v.01M12 17v-6.5M12 13.5c0-1.7 1-3 2.5-3S17 11.5 17 13v4" />
    </>
  ),
  youtube: (
    <>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor" />
    </>
  ),
  whatsapp: (
    <>
      <path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 18.8z" />
      <path d="M9 9.5c.3 2.4 2.2 4.4 4.6 4.9l1-1.1 1.6.8-.3 1.3c-3.7.2-6.9-3-6.8-6.8l1.3-.3.8 1.6z" fill="currentColor" stroke="none" />
    </>
  ),
};

export function ElementContent({ el, env }: { el: ElementLike; env: RenderEnv }) {
  const p = el.props;
  const placeholder = (text: string) => <div className="wb-placeholder">{text}</div>;
  const noFrames = env.mode === 'thumb';

  switch (el.type) {
    case 'heading': {
      const Tag = `h${Math.min(6, Math.max(1, Number(p.level) || 2))}` as 'h2';
      return <Tag className="wb-heading" dangerouslySetInnerHTML={{ __html: p.html ?? '' }} />;
    }
    case 'text':
      return <div className="wb-text" dangerouslySetInnerHTML={{ __html: p.html ?? '' }} />;
    case 'button':
      return <>{p.label}</>;
    case 'image':
      return p.src ? (
        <img src={p.src} alt={p.alt ?? ''} style={{ objectFit: p.fit ?? 'cover' }} draggable={false} loading={env.mode === 'export' ? 'lazy' : undefined} />
      ) : (
        placeholder('Escolha uma imagem')
      );
    case 'shape':
      return null;
    case 'line':
      return (
        <div
          className="wb-line"
          style={{ borderTop: `${el.style.borderWidth ?? 2}px ${el.style.borderStyle ?? 'solid'} ${resolveColor(el.style.borderColor) ?? 'currentColor'}` }}
        />
      );
    case 'video': {
      const src = videoSource(p.url ?? '', !!p.autoplay && env.mode !== 'edit');
      if (!src) return placeholder('Cole o link de um vídeo do YouTube ou Vimeo');
      if (noFrames) return placeholder('▶ Vídeo');
      if (src.kind === 'video') return <video className="wb-frame" src={src.src} controls muted={!!p.autoplay} autoPlay={!!p.autoplay && env.mode !== 'edit'} playsInline />;
      return <iframe className="wb-frame" src={src.src} title="Vídeo" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen loading="lazy" />;
    }
    case 'gallery': {
      const images: { src: string; alt?: string }[] = p.images ?? [];
      if (!images.length) return placeholder('Adicione imagens à galeria');
      const cols = Math.max(1, Number(p.columns) || 3);
      const style: CSSProperties = { gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: p.gap ?? 8 };
      return (
        <div className="wb-gallery" style={style} data-lightbox={p.lightbox ? '' : undefined}>
          {images.map((img, i) => (
            <img key={i} src={img.src} alt={img.alt ?? ''} style={{ borderRadius: p.radius ?? 0 }} draggable={false} loading={env.mode === 'export' ? 'lazy' : undefined} />
          ))}
        </div>
      );
    }
    case 'menu': {
      const pages = env.site.pages.filter((pg) => !pg.hideFromMenu);
      const align = el.style.textAlign;
      const style = {
        flexDirection: p.direction === 'column' ? 'column' : 'row',
        gap: p.gap ?? 24,
        justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
        alignItems: p.direction === 'column' ? (align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start') : 'center',
        '--wb-menu-active': resolveColor(p.activeColor) ?? 'currentColor',
      } as CSSProperties;
      return (
        <nav className="wb-menu" aria-label="Menu principal" style={{ '--wb-menu-active': style['--wb-menu-active' as keyof CSSProperties] } as CSSProperties}>
          <button className="wb-burger" type="button" aria-label="Abrir menu" aria-expanded="false" tabIndex={env.mode === 'edit' ? -1 : undefined}>
            <span />
            <span />
            <span />
          </button>
          <div className="wb-menu-links" style={style}>
            {pages.map((pg) => (
              <a key={pg.id} href={env.hrefForPage(pg.id)} className={pg.id === env.pageId ? 'wb-active' : undefined} aria-current={pg.id === env.pageId ? 'page' : undefined}>
                {pg.name}
              </a>
            ))}
          </div>
        </nav>
      );
    }
    case 'form': {
      const fields: { label: string; type: string; required?: boolean }[] = p.fields ?? [];
      return (
        <form className="wb-form" action={p.email ? `mailto:${p.email}` : undefined} method="post" encType="text/plain">
          {fields.map((f, i) => (
            <label key={i} className={f.type === 'textarea' ? 'wb-grow' : undefined}>
              {f.label}
              {f.required ? ' *' : ''}
              {f.type === 'textarea' ? (
                <textarea name={f.label} required={f.required} aria-required={f.required || undefined} tabIndex={env.mode === 'edit' ? -1 : undefined} />
              ) : (
                <input name={f.label} type={f.type} required={f.required} aria-required={f.required || undefined} autoComplete={f.type === 'email' ? 'email' : f.type === 'tel' ? 'tel' : /nome/i.test(f.label) ? 'name' : undefined} tabIndex={env.mode === 'edit' ? -1 : undefined} />
              )}
            </label>
          ))}
          <button type="submit" style={{ background: resolveColor(p.buttonColor) ?? 'var(--wb-primary)' }} tabIndex={env.mode === 'edit' ? -1 : undefined}>
            {p.submitLabel || 'Enviar'}
          </button>
        </form>
      );
    }
    case 'map': {
      if (!p.address) return placeholder('Informe um endereço');
      if (noFrames) return placeholder('⌖ Mapa');
      const src = `https://maps.google.com/maps?q=${encodeURIComponent(p.address)}&z=${p.zoom ?? 15}&output=embed`;
      return <iframe className="wb-frame" src={src} title="Mapa" loading="lazy" />;
    }
    case 'embed':
      if (noFrames) return placeholder('</> HTML');
      return <iframe className="wb-frame" srcDoc={p.html ?? ''} title="Conteúdo incorporado" sandbox="allow-scripts allow-forms allow-popups" />;
    case 'comments': {
      // Sem servidor não há comentários: no HTML estático o bloco é omitido.
      if (env.mode === 'export') return null;
      const sample = [
        ['Maria Souza', 'há 2 dias', 'Conteúdo muito útil, obrigada por compartilhar!'],
        ['João Lima', 'há 5 dias', 'Gostei bastante. Vocês atendem aos sábados?'],
      ];
      return (
        <div className="wb-comments">
          <h3 className="wb-comments-title">{p.title || 'Comentários'}</h3>
          <ol className="wb-comment-list">
            {sample.map(([name, when, body]) => (
              <li key={name}>
                <span className="wb-avatar" aria-hidden>
                  {name[0]}
                </span>
                <div>
                  <strong>{name}</strong> <span className="wb-muted">{when}</span>
                  <p>{body}</p>
                </div>
              </li>
            ))}
          </ol>
          {p.showForm && (
            <form className="wb-form wb-comment-form" onSubmit={(e) => e.preventDefault()}>
              <label>
                Deixe um comentário
                <textarea tabIndex={env.mode === 'edit' ? -1 : undefined} />
              </label>
              <button type="submit" style={{ background: 'var(--wb-primary)' }} tabIndex={env.mode === 'edit' ? -1 : undefined}>
                Publicar comentário
              </button>
            </form>
          )}
          <p className="wb-wp-note">Prévia — os comentários reais aparecem no WordPress.</p>
        </div>
      );
    }
    case 'login': {
      if (env.mode === 'export') return null;
      if (!p.asForm) return <a className="wb-login-link">Entrar</a>;
      return (
        <form className="wb-form wb-login" onSubmit={(e) => e.preventDefault()}>
          <label>
            Usuário ou e-mail
            <input type="text" autoComplete="username" tabIndex={env.mode === 'edit' ? -1 : undefined} />
          </label>
          <label>
            Senha
            <input type="password" autoComplete="current-password" tabIndex={env.mode === 'edit' ? -1 : undefined} />
          </label>
          <label className="wb-check">
            <input type="checkbox" tabIndex={env.mode === 'edit' ? -1 : undefined} /> Lembrar de mim
          </label>
          <button type="submit" style={{ background: 'var(--wb-primary)' }} tabIndex={env.mode === 'edit' ? -1 : undefined}>
            Entrar
          </button>
          <p className="wb-wp-note">Prévia — o login funciona no WordPress.</p>
        </form>
      );
    }
    case 'themeToggle':
      return (
        <button className="wb-theme-toggle" type="button" aria-label="Alternar modo escuro" tabIndex={env.mode === 'edit' ? -1 : undefined}>
          <svg className="wb-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </svg>
          <svg className="wb-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" aria-hidden>
            <path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" />
          </svg>
        </button>
      );
    case 'social': {
      const size = p.size ?? 28;
      const align = el.style.textAlign;
      const nets = Object.keys(SOCIAL_ICONS).filter((k) => p[k]);
      return (
        <div
          className="wb-social"
          style={{ gap: Math.round(size / 2), color: resolveColor(p.iconColor), justifyContent: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start' }}
        >
          {nets.map((k) => (
            <a key={k} href={p[k]} target="_blank" rel="noopener noreferrer" aria-label={k} style={{ width: size, height: size }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                {SOCIAL_ICONS[k]}
              </svg>
            </a>
          ))}
        </div>
      );
    }
  }
}

/** Widget de container: estilo e tamanho vêm do CSS gerado (permite ajustes por breakpoint). */
export function RenderedWidget({ node, env }: { node: WidgetNode; env: RenderEnv }) {
  const className = `wb-el wb-t-${node.type} n-${node.id}`;
  const link = ELEMENTS[node.type].linkable ? linkProps(node.link, env) : null;
  const content = <ElementContent el={node} env={env} />;
  return link ? (
    <a className={className} {...link}>
      {content}
    </a>
  ) : (
    <div className={className}>{content}</div>
  );
}

/** Elemento completo como aparece no site publicado (posição vem do CSS de layout). */
export function RenderedElement({ el, env }: { el: SiteElement; env: RenderEnv }) {
  const className = `wb-el e-${el.id} wb-t-${el.type}`;
  const style = elementCss(el);
  const link = ELEMENTS[el.type].linkable ? linkProps(el.link, env) : null;
  const content = <ElementContent el={el} env={env} />;
  if (link) {
    return (
      <a className={className} style={style} {...link}>
        {content}
      </a>
    );
  }
  return (
    <div className={className} style={style}>
      {content}
    </div>
  );
}
