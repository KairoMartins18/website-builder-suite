import { useEffect, useState } from 'react';
import { useEditor } from '../store/editor';
import { storage } from '../lib/storage';
import { navigate } from '../lib/router';
import { collectFonts } from '../lib/theme';
import { useFonts } from '../lib/fontLoader';
import { findSection } from '../lib/siteOps';
import { Canvas } from './Canvas';
import { Inspector } from './Inspector';
import { LeftDrawer, LeftRail } from './LeftPanel';
import { TopBar } from './TopBar';
import { saveNow, startAutosave } from './save';
import { copyElement, deleteElement, duplicateElement, pasteElement } from './actions';
import { nudge } from './gestures';
import { copyNode, deleteNode, duplicateNode, moveNodeSibling } from './flowActions';
import { confirmDeleteSection } from './confirmations';

function isTyping(target: EventTarget | null) {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName));
}

function onKeyDown(e: KeyboardEvent) {
  if (isTyping(e.target)) return;
  const st = useEditor.getState();
  if (!st.site) return;
  const mod = e.ctrlKey || e.metaKey;
  const key = e.key.toLowerCase();
  const sel = st.selection;

  if (mod && key === 'z') {
    e.preventDefault();
    if (e.shiftKey) st.redo();
    else st.undo();
  } else if (mod && key === 'y') {
    e.preventDefault();
    st.redo();
  } else if (mod && key === 's') {
    e.preventDefault();
    void saveNow();
  } else if (mod && key === 'd' && sel?.kind === 'element') {
    e.preventDefault();
    duplicateElement(sel.id);
  } else if (mod && key === 'd' && sel?.kind === 'node') {
    e.preventDefault();
    duplicateNode(sel.id);
  } else if (mod && key === 'c' && sel?.kind === 'element') {
    copyElement(sel.id);
  } else if (mod && key === 'c' && sel?.kind === 'node') {
    copyNode(sel.id);
  } else if (mod && key === 'x' && sel?.kind === 'element') {
    copyElement(sel.id);
    deleteElement(sel.id);
  } else if (mod && key === 'x' && sel?.kind === 'node') {
    copyNode(sel.id);
    deleteNode(sel.id);
  } else if (mod && key === 'v') {
    pasteElement();
  } else if (key === 'delete' || key === 'backspace') {
    if (sel?.kind === 'element') {
      e.preventDefault();
      deleteElement(sel.id);
    } else if (sel?.kind === 'node') {
      e.preventDefault();
      deleteNode(sel.id);
    } else if (sel?.kind === 'section') {
      const s = findSection(st.site, sel.id);
      if (s?.kind === 'body') void confirmDeleteSection(s);
    }
  } else if (key === 'escape') {
    st.select(null);
  } else if (key === 'enter' && (sel?.kind === 'element' || sel?.kind === 'node')) {
    st.setEditingText(sel.id);
  } else if (sel?.kind === 'node' && (key === 'arrowup' || key === 'arrowleft' || key === 'arrowdown' || key === 'arrowright')) {
    e.preventDefault();
    moveNodeSibling(sel.id, key === 'arrowup' || key === 'arrowleft' ? -1 : 1);
  } else if (sel?.kind === 'element' && key.startsWith('arrow')) {
    e.preventDefault();
    const step = e.shiftKey ? 10 : 1;
    const d = { arrowleft: [-step, 0], arrowright: [step, 0], arrowup: [0, -step], arrowdown: [0, step] }[key];
    if (d) nudge(sel.id, d[0], d[1]);
  }
}

export function Editor({ siteId }: { siteId: string }) {
  const site = useEditor((s) => s.site);
  const device = useEditor((s) => s.device);
  const [missing, setMissing] = useState(false);
  useFonts(site ? collectFonts(site) : []);

  useEffect(() => {
    let alive = true;
    // Garante que alterações pendentes (de uma sessão anterior) foram gravadas antes de ler.
    saveNow().then(() => storage.getSite(siteId)).then((s) => {
      if (!alive) return;
      if (s) useEditor.getState().load(s);
      else setMissing(true);
    });
    const stopAutosave = startAutosave();
    const beforeUnload = (e: BeforeUnloadEvent) => {
      // No app desktop o fechamento é tratado pelo processo principal (ver main.tsx).
      if (!window.wbNative && useEditor.getState().saveState !== 'saved') {
        void saveNow();
        e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('beforeunload', beforeUnload);
    return () => {
      alive = false;
      stopAutosave();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('beforeunload', beforeUnload);
      void saveNow();
    };
  }, [siteId]);

  if (missing)
    return (
      <div className="empty-state">
        <h2>Site não encontrado</h2>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Voltar aos meus sites
        </button>
      </div>
    );
  if (!site || site.id !== siteId) return <div className="loading">Carregando editor…</div>;

  return (
    <div className={`ed ed-device-${device}`}>
      <TopBar />
      <div className="ed-body">
        <LeftRail />
        <LeftDrawer />
        <Canvas />
        <Inspector />
      </div>
    </div>
  );
}
