import { useEffect } from 'react';
import { googleFontsUrl } from './fonts';

const loaded = new Set<string>();

/** Carrega fontes do Google Fonts sob demanda (cada família uma única vez). */
export function ensureFonts(names: Iterable<string>) {
  for (const name of names) {
    if (loaded.has(name)) continue;
    const url = googleFontsUrl([name]);
    if (!url) continue;
    loaded.add(name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
}

export function useFonts(names: string[]) {
  const key = names.join('|');
  useEffect(() => {
    ensureFonts(names);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
}
