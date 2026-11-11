import { create } from 'zustand';
import { produce } from 'immer';
import type { DeviceMode, FlowNode, Site, SiteElement } from '../types';
import { findElement, findSection } from '../lib/siteOps';
import { findNode } from '../lib/flow';

/** element = elemento de seção livre; node = container/widget de seção em fluxo. */
export type Selection = { kind: 'element'; id: string } | { kind: 'node'; id: string } | { kind: 'section'; id: string } | null;
export type Clipboard = { kind: 'element'; element: SiteElement } | { kind: 'node'; node: FlowNode };
export type LeftPanel = 'add' | 'sections' | 'pages' | 'layers' | 'theme';
export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

/** Linhas-guia de alinhamento exibidas durante arrastar/redimensionar. */
export interface Guides {
  sectionId: string;
  x: number[];
  y: number[];
}

interface MutateOptions {
  /** false = não grava no histórico (usado durante gestos). */
  history?: boolean;
  /** Edições consecutivas com a mesma chave (ex.: digitando) viram um único passo de desfazer. */
  key?: string;
}

interface EditorState {
  site: Site | null;
  past: Site[];
  future: Site[];
  pageId: string;
  selection: Selection;
  device: DeviceMode;
  editingTextId: string | null;
  guides: Guides | null;
  leftPanel: LeftPanel | null;
  saveState: SaveState;
  clipboard: Clipboard | null;
  /** Como o site aparece no canvas (para sites com modo escuro). */
  previewScheme: 'light' | 'dark';

  load(site: Site): void;
  close(): void;
  mutate(recipe: (draft: Site) => void, opts?: MutateOptions): void;
  beginGesture(): void;
  endGesture(changed: boolean): void;
  undo(): void;
  redo(): void;
  setPage(pageId: string): void;
  select(sel: Selection): void;
  setDevice(device: DeviceMode): void;
  setEditingText(id: string | null): void;
  setGuides(g: Guides | null): void;
  setLeftPanel(p: LeftPanel | null): void;
  setSaveState(s: SaveState): void;
  setClipboard(c: Clipboard | null): void;
  setPreviewScheme(s: 'light' | 'dark'): void;
}

const HISTORY_LIMIT = 100;
let lastKey: string | undefined;
let lastKeyTime = 0;
let gestureBase: Site | null = null;

/** Remove a seleção se o item não existe mais (após desfazer, por exemplo). */
function validSelection(site: Site, sel: Selection): Selection {
  if (!sel) return null;
  if (sel.kind === 'element') return findElement(site, sel.id) ? sel : null;
  if (sel.kind === 'node') return findNode(site, sel.id) ? sel : null;
  return findSection(site, sel.id) ? sel : null;
}

function validPage(site: Site, pageId: string): string {
  return site.pages.some((p) => p.id === pageId) ? pageId : site.homePageId;
}

export const useEditor = create<EditorState>((set, get) => ({
  site: null,
  past: [],
  future: [],
  pageId: '',
  selection: null,
  device: 'desktop',
  editingTextId: null,
  guides: null,
  leftPanel: null,
  saveState: 'saved',
  clipboard: null,
  previewScheme: 'light',

  load: (site) =>
    set({ site, past: [], future: [], pageId: site.homePageId, selection: null, editingTextId: null, guides: null, saveState: 'saved', device: 'desktop' }),
  close: () => set({ site: null, past: [], future: [], selection: null }),

  mutate: (recipe, opts = {}) => {
    const { site, past } = get();
    if (!site) return;
    const next = produce(site, (draft) => {
      recipe(draft);
      draft.updatedAt = Date.now();
    });
    if (next === site) return;
    const now = Date.now();
    const coalesce = opts.key !== undefined && opts.key === lastKey && now - lastKeyTime < 1500;
    lastKey = opts.key;
    lastKeyTime = now;
    if (opts.history === false || coalesce) {
      set({ site: next, saveState: 'pending' });
    } else {
      set({ site: next, past: [...past.slice(-HISTORY_LIMIT + 1), site], future: [], saveState: 'pending' });
    }
  },

  beginGesture: () => {
    gestureBase = get().site;
    lastKey = undefined;
  },
  endGesture: (changed) => {
    const base = gestureBase;
    gestureBase = null;
    if (changed && base && base !== get().site) {
      set((s) => ({ past: [...s.past.slice(-HISTORY_LIMIT + 1), base], future: [] }));
    }
  },

  undo: () => {
    const { site, past, future, selection, pageId } = get();
    if (!site || !past.length) return;
    const prev = past[past.length - 1];
    lastKey = undefined;
    set({
      site: prev,
      past: past.slice(0, -1),
      future: [site, ...future],
      selection: validSelection(prev, selection),
      pageId: validPage(prev, pageId),
      editingTextId: null,
      saveState: 'pending',
    });
  },
  redo: () => {
    const { site, past, future, selection, pageId } = get();
    if (!site || !future.length) return;
    const next = future[0];
    lastKey = undefined;
    set({
      site: next,
      past: [...past, site],
      future: future.slice(1),
      selection: validSelection(next, selection),
      pageId: validPage(next, pageId),
      editingTextId: null,
      saveState: 'pending',
    });
  },

  setPage: (pageId) => set({ pageId, selection: null, editingTextId: null }),
  select: (selection) => set((s) => ({ selection, editingTextId: selection && selection.kind !== 'section' && selection.id === s.editingTextId ? s.editingTextId : null })),
  setDevice: (device) => set({ device, editingTextId: null }),
  setEditingText: (editingTextId) => set({ editingTextId }),
  setGuides: (guides) => set({ guides }),
  setLeftPanel: (leftPanel) => set({ leftPanel }),
  setSaveState: (saveState) => set({ saveState }),
  setClipboard: (clipboard) => set({ clipboard }),
  setPreviewScheme: (previewScheme) => set({ previewScheme }),
}));
