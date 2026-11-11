import type { Site, SiteMeta } from '../types';

/**
 * Camada de persistência. No navegador usamos IndexedDB; o app Electron
 * poderá injetar `window.wbNative.storage` (arquivos no disco) com a mesma interface.
 */
export interface StorageAdapter {
  listSites(): Promise<SiteMeta[]>;
  getSite(id: string): Promise<Site | undefined>;
  saveSite(site: Site): Promise<void>;
  deleteSite(id: string): Promise<void>;
}

/** API exposta pelo app desktop (electron/preload.cjs). Ausente no navegador. */
export interface NativeBridge {
  platform: string;
  storage: StorageAdapter;
  exportSite(folderName: string, files: { path: string; data: string | Uint8Array }[]): Promise<string | null>;
  openExported(dir: string, file?: string): Promise<void>;
  onBeforeClose(callback: () => void): void;
  closeReady(): void;
}

declare global {
  interface Window {
    wbNative?: NativeBridge;
  }
}

export const native: NativeBridge | undefined = window.wbNative;

export function toMeta(site: Site): SiteMeta {
  return {
    id: site.id,
    name: site.name,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
    templateId: site.templateId,
  };
}

class IdbStorage implements StorageAdapter {
  private db: Promise<IDBDatabase>;

  constructor() {
    this.db = new Promise((resolve, reject) => {
      const req = indexedDB.open('website-builder-suite', 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore('sites', { keyPath: 'id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  private async run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
    const db = await this.db;
    return new Promise<T>((resolve, reject) => {
      const tx = db.transaction('sites', mode);
      const req = fn(tx.objectStore('sites'));
      tx.oncomplete = () => resolve(req.result as T);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  }

  async listSites() {
    const all = await this.run<Site[]>('readonly', (s) => s.getAll());
    return all.map(toMeta).sort((a, b) => b.updatedAt - a.updatedAt);
  }
  getSite(id: string) {
    return this.run<Site | undefined>('readonly', (s) => s.get(id));
  }
  async saveSite(site: Site) {
    await this.run('readwrite', (s) => s.put(site));
  }
  async deleteSite(id: string) {
    await this.run('readwrite', (s) => s.delete(id));
  }
}

export const storage: StorageAdapter = window.wbNative?.storage ?? new IdbStorage();
