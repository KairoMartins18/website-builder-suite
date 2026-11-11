import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { BASE_CSS } from './render/baseCss';
import './styles.css';
import { native } from './lib/storage';
import { saveNow } from './editor/save';

// CSS dos sites renderizados (o mesmo usado no HTML exportado).
const style = document.createElement('style');
style.id = 'wb-base-css';
style.textContent = BASE_CSS;
document.head.prepend(style);

// App desktop: salva alterações pendentes antes de a janela fechar.
if (native) {
  const bridge = native;
  bridge.onBeforeClose(() => {
    saveNow().finally(() => bridge.closeReady());
  });
  document.documentElement.classList.add('is-desktop');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
