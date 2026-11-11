import { useEffect, useState } from 'react';

// Roteamento por hash: funciona no navegador e via file:// no Electron.
export type Route =
  | { name: 'dashboard' }
  | { name: 'editor'; siteId: string }
  | { name: 'preview'; siteId: string; pageId?: string };

export function parseRoute(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'editor' && parts[1]) return { name: 'editor', siteId: parts[1] };
  if (parts[0] === 'preview' && parts[1]) return { name: 'preview', siteId: parts[1], pageId: parts[2] };
  return { name: 'dashboard' };
}

export function navigate(path: string) {
  location.hash = path.startsWith('#') ? path : `#${path}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(location.hash));
  useEffect(() => {
    const on = () => setRoute(parseRoute(location.hash));
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
