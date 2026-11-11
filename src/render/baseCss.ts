/** Regras de celular: menu vira botão "hambúrguer" com lista suspensa; galerias com 2 colunas. */
export const mobileMenuCss = (scope: string) => `
${scope} .wb-burger{display:flex;margin-left:auto}
${scope} .wb-gallery{grid-template-columns:repeat(2,1fr)!important}
${scope} .wb-menu-links{display:none;position:absolute;top:calc(100% + 6px);right:0;min-width:220px;height:auto;flex-direction:column!important;align-items:stretch!important;gap:0!important;padding:8px;background:var(--wb-background);color:var(--wb-text);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.18);z-index:100}
${scope} .wb-menu.wb-open .wb-menu-links{display:flex}
${scope} .wb-menu-links a{padding:10px 12px;border-bottom:0;border-radius:6px;text-align:left}
${scope} .wb-menu-links a.wb-active{background:rgba(127,127,127,.12)}
`;

/** Comportamentos interativos do site na pré-visualização (o HTML publicado usa SITE_SCRIPT). */
export function handleSiteClick(target: EventTarget | null, onToggleScheme?: () => void) {
  const el = target as HTMLElement | null;
  if (el?.closest?.('.wb-theme-toggle')) {
    onToggleScheme?.();
    return;
  }
  const img = el?.closest?.('.wb-gallery[data-lightbox] img') as HTMLImageElement | null;
  if (img) {
    openLightbox(img);
    return;
  }
  handleMenuClick(target);
}

function openLightbox(img: HTMLImageElement) {
  const o = document.createElement('div');
  o.className = 'wb-lightbox';
  o.setAttribute('role', 'dialog');
  o.setAttribute('aria-label', 'Imagem ampliada');
  o.tabIndex = -1;
  const big = document.createElement('img');
  big.src = img.currentSrc || img.src;
  big.alt = img.alt;
  o.appendChild(big);
  const close = () => {
    o.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
  o.addEventListener('click', close);
  document.addEventListener('keydown', onKey);
  document.body.appendChild(o);
  o.focus();
}

/** Script do site publicado (HTML exportado e tema WordPress): zoom das seções livres, menu, lightbox e modo escuro. */
export const SITE_SCRIPT = [
  '(function(){var d=document.documentElement;',
  "function z(){var w=d.clientWidth,k=w<768?w/360:w<980?w/980:1;d.style.setProperty('--wb-zoom',k)}z();addEventListener('resize',z);",
  "function dark(){var s=d.getAttribute('data-wb-scheme');return s?s==='dark':matchMedia('(prefers-color-scheme: dark)').matches}",
  "function lb(img){var o=document.createElement('div');o.className='wb-lightbox';o.setAttribute('role','dialog');o.setAttribute('aria-label','Imagem ampliada');o.tabIndex=-1;var b=document.createElement('img');b.src=img.currentSrc||img.src;b.alt=img.alt;o.appendChild(b);o.addEventListener('click',function(){o.remove()});document.body.appendChild(o);o.focus()}",
  "document.addEventListener('keydown',function(e){if(e.key==='Escape'){var o=document.querySelector('.wb-lightbox');if(o)o.remove()}});",
  "document.addEventListener('click',function(e){var t=e.target;if(!t.closest)return;",
  "if(t.closest('.wb-theme-toggle')){var n=dark()?'light':'dark';d.setAttribute('data-wb-scheme',n);try{localStorage.setItem('wb-scheme',n)}catch(x){}return}",
  "var img=t.closest('.wb-gallery[data-lightbox] img,.wb-lightbox-gallery img');if(img){e.preventDefault();lb(img);return}",
  "var b=t.closest('.wb-burger');if(b){b.setAttribute('aria-expanded',b.parentNode.classList.toggle('wb-open'));return}",
  "document.querySelectorAll('.wb-menu.wb-open').forEach(function(m){if(!m.contains(t)||t.closest('a')){m.classList.remove('wb-open');m.querySelector('.wb-burger').setAttribute('aria-expanded','false')}})})})();",
].join('');

/** Aplica a preferência salva antes da página aparecer (evita "piscar" claro→escuro). */
export const SCHEME_BOOT_SCRIPT = "try{var s=localStorage.getItem('wb-scheme');if(s)document.documentElement.setAttribute('data-wb-scheme',s)}catch(e){}";

/** Abre/fecha o menu hambúrguer. */
export function handleMenuClick(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  const burger = el?.closest?.('.wb-burger');
  if (burger) {
    const open = burger.parentElement!.classList.toggle('wb-open');
    burger.setAttribute('aria-expanded', String(open));
    return;
  }
  document.querySelectorAll('.wb-menu.wb-open').forEach((m) => {
    if (!m.contains(el) || el?.closest('a')) {
      m.classList.remove('wb-open');
      m.querySelector('.wb-burger')?.setAttribute('aria-expanded', 'false');
    }
  });
}

/** CSS base do site publicado. Também é carregado no editor e na pré-visualização. */
export const BASE_CSS = `
.wb-site{position:relative;background:var(--wb-background);color:var(--wb-text);font-family:var(--wb-font-body);-webkit-font-smoothing:antialiased;min-height:100%}
.wb-site *,.wb-site *::before,.wb-site *::after{box-sizing:border-box}
.wb-section{position:relative;display:block;width:100%;overflow-x:clip}
.wb-sticky{position:sticky;top:0;z-index:50}
.wb-overlay{position:absolute;inset:0;pointer-events:none}
.wb-inner{position:relative;width:980px;height:100%;margin:0 auto}
.wb-el{position:absolute;display:block;color:inherit;text-decoration:none;overflow-wrap:break-word}
.wb-heading{margin:0;font:inherit;color:inherit;letter-spacing:inherit;text-transform:inherit}
.wb-text{white-space:pre-wrap}
.wb-heading a,.wb-text a{color:inherit}
.wb-t-button{display:flex;align-items:center;justify-content:center;text-align:center;cursor:pointer;transition:filter .15s ease,transform .15s ease;line-height:1.2}
a.wb-t-button:hover{filter:brightness(.92)}
a.wb-t-button:active{transform:translateY(1px)}
.wb-t-image,.wb-t-video,.wb-t-gallery,.wb-t-map,.wb-t-embed,.wb-t-shape{overflow:hidden}
.wb-t-image img{display:block;width:100%;height:100%}
.wb-frame{display:block;width:100%;height:100%;border:0}
.wb-placeholder{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:repeating-linear-gradient(45deg,rgba(0,0,0,.04) 0 10px,rgba(0,0,0,.08) 10px 20px);color:rgba(0,0,0,.45);font:500 14px/1.3 system-ui,sans-serif;text-align:center;padding:12px}
.wb-line{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%)}
.wb-gallery{display:grid;width:100%;height:100%;grid-auto-rows:1fr}
.wb-gallery img{display:block;width:100%;height:100%;object-fit:cover;min-height:0}
.wb-menu{position:relative;height:100%}
.wb-menu-links{display:flex;align-items:center;flex-wrap:wrap;height:100%}
.wb-burger{display:none;flex-direction:column;align-items:center;justify-content:center;gap:5px;width:100%;height:100%;padding:0;border:0;background:none;color:inherit;cursor:pointer}
.wb-burger span{display:block;width:22px;height:2px;border-radius:2px;background:currentColor}
.wb-menu a{color:inherit;text-decoration:none;padding:4px 0;border-bottom:2px solid transparent;transition:color .15s}
.wb-menu a:hover{color:var(--wb-menu-active)}
.wb-menu a.wb-active{color:var(--wb-menu-active);border-bottom-color:currentColor}
.wb-form{display:flex;flex-direction:column;gap:12px;height:100%}
.wb-form label{display:flex;flex-direction:column;gap:6px;font-size:.9em;font-weight:500}
.wb-form label.wb-grow{flex:1}
.wb-form input,.wb-form textarea{width:100%;padding:10px 12px;border:1px solid rgba(127,127,127,.4);border-radius:6px;font:inherit;font-weight:400;background:#fff;color:#1d2433}
.wb-form textarea{flex:1;min-height:70px;resize:vertical}
.wb-form button{padding:12px 18px;border:0;border-radius:6px;font:inherit;font-weight:600;color:#fff;cursor:pointer}
.wb-form button:hover{filter:brightness(.92)}
.wb-social{display:flex;align-items:center;flex-wrap:wrap;height:100%}
.wb-social a{display:inline-flex;color:inherit;transition:opacity .15s}
.wb-social a:hover{opacity:.7}
.wb-social svg{width:100%;height:100%}
.wb-c{min-width:0}
.wb-flow>.wb-c{position:relative}
:where(.wb-flow) .wb-el{position:relative}
:where(.wb-flow) .wb-t-button{padding:12px 28px}
:where(.wb-flow) .wb-t-video{aspect-ratio:16/9}
:where(.wb-flow) .wb-t-map,:where(.wb-flow) .wb-t-embed{min-height:120px}
:where(.wb-flow) .wb-t-shape{min-height:20px}
:where(.wb-flow) .wb-t-line{min-height:20px}
:where(.wb-flow) .wb-gallery{height:auto;grid-auto-rows:auto}
:where(.wb-flow) .wb-gallery img{height:auto;aspect-ratio:4/3}
:where(.wb-flow) .wb-burger{width:40px;height:40px}
.wb-skip{position:absolute;left:-9999px;top:8px;z-index:1000;padding:12px 18px;border-radius:6px;background:#111;color:#fff;font:600 15px/1.2 system-ui,sans-serif}
.wb-skip:focus{left:8px}
.wb-site a:focus-visible,.wb-site button:focus-visible,.wb-site input:focus-visible,.wb-site textarea:focus-visible{outline:3px solid var(--wb-primary);outline-offset:2px}
@media (prefers-reduced-motion:reduce){.wb-site *{transition:none!important;animation:none!important}}
.wb-comments{display:flex;flex-direction:column;gap:16px}
.wb-comments-title{margin:0;font:inherit;font-size:1.3em;font-weight:700}
.wb-comment-list{display:flex;flex-direction:column;gap:16px;margin:0;padding:0;list-style:none}
.wb-comment-list li{display:flex;gap:12px}
.wb-comment-list p{margin:4px 0 0}
.wb-avatar{display:flex;flex:none;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:var(--wb-muted);font-weight:700}
.wb-muted{font-size:.9em;opacity:.65}
.wb-wp-note{margin:0;font-size:12px;opacity:.6}
.wb-form .wb-check{flex-direction:row;align-items:center;gap:8px;font-weight:400}
.wb-form .wb-check input{width:auto}
.wb-login-link{color:inherit;font-weight:600;text-decoration:underline}
.wb-theme-toggle{display:flex;align-items:center;justify-content:center;width:100%;height:100%;min-width:40px;min-height:40px;padding:0;border:0;background:none;color:inherit;cursor:pointer}
.wb-theme-toggle svg{width:22px;height:22px}
.wb-moon{display:none}
.wb-gallery[data-lightbox] img{cursor:zoom-in}
.wb-lightbox{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.88);cursor:zoom-out}
.wb-lightbox img{max-width:100%;max-height:100%;border-radius:8px}
.wb-widget{display:flex;flex-direction:column;gap:10px}
.wb-widget-title{margin:0;font:inherit;font-size:1.15em;font-weight:700}
.wb-list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}
.wb-list a,.wb-tags a,.wb-post-title a,.wb-post-nav a{color:inherit;text-decoration:none}
.wb-list a:hover,.wb-tags a:hover,.wb-post-title a:hover{color:var(--wb-primary)}
.wb-select{width:100%;padding:9px 10px;border:1px solid rgba(127,127,127,.4);border-radius:6px;font:inherit;background:var(--wb-background);color:inherit}
.wb-tags{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:baseline}
.wb-feed{display:grid;gap:28px}
.wb-feed-grid{grid-template-columns:repeat(var(--wb-cols,3),minmax(0,1fr))}
.wb-feed-list .wb-post-card{flex-direction:row;align-items:flex-start}
.wb-feed-list .wb-post-img{width:38%;flex:none}
.wb-post-card{display:flex;flex-direction:column;gap:14px;min-width:0}
.wb-post-body{display:flex;flex-direction:column;gap:8px;min-width:0}
.wb-post-img,.wb-post-featured{display:block;width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:inherit}
.wb-post-img{border-radius:10px}
.wb-post-featured{height:100%}
.wb-post-cat{align-self:flex-start;padding:2px 10px;border-radius:999px;background:color-mix(in srgb,var(--wb-primary) 14%,transparent);color:var(--wb-primary);font-size:.8em;font-weight:600}
.wb-post-title{margin:0;font-family:var(--wb-font-heading);font-size:1.3em;line-height:1.25}
.wb-post-meta{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;font-size:.88em;opacity:.75}
.wb-post-excerpt{margin:0;opacity:.85}
.wb-read-more{color:var(--wb-primary);font-weight:600;font-size:.92em}
.wb-pagination{grid-column:1/-1;display:flex;gap:8px;flex-wrap:wrap}
.wb-pagination>*{padding:6px 12px;border-radius:6px;border:1px solid rgba(127,127,127,.3)}
.wb-pagination [aria-current]{background:var(--wb-primary);border-color:var(--wb-primary);color:#fff}
.wb-search{display:flex;gap:8px}
.wb-search input{flex:1;min-width:0;padding:10px 12px;border:1px solid rgba(127,127,127,.4);border-radius:6px;font:inherit;background:var(--wb-background);color:inherit}
.wb-search button{padding:10px 18px;border:0;border-radius:6px;background:var(--wb-primary);color:#fff;font:inherit;font-weight:600;cursor:pointer}
.wb-post-content p{margin:0 0 1em}
.wb-post-nav{display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap}
.wb-post-author{display:flex;gap:14px;align-items:center}
.wb-post-author p{margin:4px 0 0;opacity:.8}
@media (max-width:767px){.wb-feed-grid{grid-template-columns:1fr}.wb-feed-list .wb-post-card{flex-direction:column}.wb-feed-list .wb-post-img{width:100%}}
.wb-mobile .wb-feed-grid{grid-template-columns:1fr}
${mobileMenuCss('.wb-mobile')}`;
