import type { Site } from '../types';
import { native } from './storage';
import { slugify } from './siteOps';
import { createZip, downloadBlob } from './zip';
import { confirmDialog } from '../components/Dialogs';

/**
 * Exporta o site como HTML estático.
 * App desktop: grava numa pasta escolhida pelo usuário. Navegador: baixa um .zip.
 */
export async function exportSite(site: Site): Promise<void> {
  const { exportSiteFiles } = await import('../render/exportSite');
  const files = await exportSiteFiles(site);
  const name = slugify(site.name);
  if (native) {
    const dir = await native.exportSite(name, files);
    if (!dir) return;
    const open = await confirmDialog({
      title: 'Site exportado',
      message: `Os arquivos foram salvos em:\n${dir}`,
      confirmLabel: 'Abrir no navegador',
      cancelLabel: 'Fechar',
      extra: { label: 'Abrir pasta', onClick: () => void native!.openExported(dir) },
    });
    if (open) await native.openExported(dir, 'index.html');
    return;
  }
  downloadBlob(createZip(files), `${name}.zip`);
}

/** Baixa/salva o backup completo do site em JSON. */
export function downloadBackup(site: Site) {
  downloadBlob(new Blob([JSON.stringify(site)], { type: 'application/json' }), `${slugify(site.name)}-backup.json`);
}
