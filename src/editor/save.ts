import { useEditor } from '../store/editor';
import { storage } from '../lib/storage';

let timer: ReturnType<typeof setTimeout> | undefined;
let inFlight: Promise<void> | null = null;

export function scheduleSave(delay = 800) {
  clearTimeout(timer);
  timer = setTimeout(() => void saveNow(), delay);
}

/** Salva imediatamente (se houver alterações pendentes). */
export async function saveNow(): Promise<void> {
  clearTimeout(timer);
  if (inFlight) await inFlight;
  const st = useEditor.getState();
  const site = st.site;
  if (!site || st.saveState === 'saved') return;
  st.setSaveState('saving');
  inFlight = storage
    .saveSite(site)
    .then(() => {
      const now = useEditor.getState();
      if (now.site === site) now.setSaveState('saved');
      else {
        now.setSaveState('pending');
        scheduleSave();
      }
    })
    .catch((err) => {
      console.error('Falha ao salvar', err);
      useEditor.getState().setSaveState('error');
    })
    .finally(() => {
      inFlight = null;
    });
  await inFlight;
}

/** Observa mudanças no site e agenda o salvamento automático. */
export function startAutosave(): () => void {
  return useEditor.subscribe((state, prev) => {
    if (state.site && prev.site && state.site !== prev.site) scheduleSave();
  });
}
