/** No celular o menu vira um botão "hambúrguer" com lista suspensa. */
export const mobileMenuCss = (scope: string) => `
${scope} .wb-burger{display:flex}
${scope} .wb-menu-links{display:none;position:absolute;top:calc(100% + 6px);right:0;min-width:220px;height:auto;flex-direction:column!important;align-items:stretch!important;gap:0!important;padding:8px;background:var(--wb-background);color:var(--wb-text);border-radius:10px;box-shadow:0 12px 32px rgba(0,0,0,.18);z-index:100}
${scope} .wb-menu.wb-open .wb-menu-links{display:flex}
${scope} .wb-menu-links a{padding:10px 12px;border-bottom:0;border-radius:6px;text-align:left}
${scope} .wb-menu-links a.wb-active{background:rgba(127,127,127,.12)}
`;

/** Abre/fecha o menu hambúrguer (usado no HTML exportado e na pré-visualização). */
export function handleMenuClick(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  const burger = el?.closest?.('.wb-burger');
  if (burger) {
    burger.parentElement?.classList.toggle('wb-open');
    return;
  }
  document.querySelectorAll('.wb-menu.wb-open').forEach((m) => {
    if (!m.contains(el) || el?.closest('a')) m.classList.remove('wb-open');
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
${mobileMenuCss('.wb-mobile')}`;
