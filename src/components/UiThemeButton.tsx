import { useUiTheme, type UiTheme } from '../lib/uiTheme';
import { Icon } from './Icon';

const NEXT: Record<UiTheme, UiTheme> = { system: 'light', light: 'dark', dark: 'system' };
const LABEL: Record<UiTheme, string> = { system: 'Tema do app: automático (sistema)', light: 'Tema do app: claro', dark: 'Tema do app: escuro' };
const ICON: Record<UiTheme, string> = { system: 'contrast', light: 'sun', dark: 'moon' };

/** Alterna o tema da interface: automático → claro → escuro. */
export function UiThemeButton() {
  const [theme, setTheme] = useUiTheme();
  return (
    <button className="icon-btn ui-theme-btn" title={`${LABEL[theme]} — clique para trocar`} aria-label={LABEL[theme]} onClick={() => setTheme(NEXT[theme])}>
      <Icon name={ICON[theme]} />
    </button>
  );
}
