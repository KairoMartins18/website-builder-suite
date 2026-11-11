import { useEffect, useState } from 'react';

/** Tema da interface do aplicativo (não confundir com o modo escuro dos sites). */
export type UiTheme = 'system' | 'light' | 'dark';
const KEY = 'wbs-ui-theme';

export function getUiTheme(): UiTheme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    /* armazenamento indisponível */
  }
  return 'system';
}

export function applyUiTheme(theme: UiTheme) {
  const root = document.documentElement;
  if (theme === 'system') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
}

export function setUiTheme(theme: UiTheme) {
  try {
    if (theme === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, theme);
  } catch {
    /* ignora */
  }
  applyUiTheme(theme);
  window.dispatchEvent(new Event('wbs-ui-theme'));
}

export function useUiTheme(): [UiTheme, (t: UiTheme) => void] {
  const [theme, setTheme] = useState(getUiTheme);
  useEffect(() => {
    const on = () => setTheme(getUiTheme());
    window.addEventListener('wbs-ui-theme', on);
    return () => window.removeEventListener('wbs-ui-theme', on);
  }, []);
  return [theme, setUiTheme];
}
