import { useState } from 'react';
import { useEditor } from '../store/editor';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { DeviceSwitch } from '../components/DeviceSwitch';
import { UiThemeButton } from '../components/UiThemeButton';
import { saveNow } from './save';
import { updateSite } from './actions';
import { downloadWordPressPlugin, exportSite, exportWordPressTheme } from '../lib/exportActions';
import { alertDialog } from '../components/Dialogs';

const SAVE_LABEL = { saved: 'Salvo', pending: 'Alterações não salvas', saving: 'Salvando…', error: 'Erro ao salvar' };

export function TopBar() {
  const site = useEditor((s) => s.site)!;
  const pageId = useEditor((s) => s.pageId);
  const setPage = useEditor((s) => s.setPage);
  const device = useEditor((s) => s.device);
  const setDevice = useEditor((s) => s.setDevice);
  const canUndo = useEditor((s) => s.past.length > 0);
  const canRedo = useEditor((s) => s.future.length > 0);
  const saveState = useEditor((s) => s.saveState);
  const [exporting, setExporting] = useState(false);
  const previewScheme = useEditor((s) => s.previewScheme);
  const hasDark = !!site.settings.darkMode && site.settings.darkMode !== 'off';

  const [exportMenu, setExportMenu] = useState(false);
  const runExport = async (kind: 'html' | 'wp' | 'plugin') => {
    setExportMenu(false);
    setExporting(true);
    try {
      await saveNow();
      const current = useEditor.getState().site!;
      if (kind === 'html') await exportSite(current);
      else if (kind === 'wp') await exportWordPressTheme(current);
      else await downloadWordPressPlugin();
    } catch (err) {
      console.error(err);
      void alertDialog('Não foi possível exportar o site', String(err));
    } finally {
      setExporting(false);
    }
  };

  return (
    <header className="ed-topbar">
      <div className="ed-topbar-left">
        <button
          className="icon-btn"
          title="Voltar aos meus sites"
          onClick={async () => {
            await saveNow();
            navigate('/');
          }}
        >
          <Icon name="back" />
        </button>
        <input className="ed-site-name" value={site.name} onChange={(e) => updateSite((d) => void (d.name = e.target.value), 'site.name')} />
        <span className={`ed-save ed-save-${saveState}`}>{SAVE_LABEL[saveState]}</span>
      </div>

      <div className="ed-topbar-center">
        <label className="ed-page-select">
          <Icon name="pages" size={16} />
          <select value={pageId} onChange={(e) => setPage(e.target.value)}>
            {site.pages.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <DeviceSwitch value={device} onChange={setDevice} />
        {hasDark && (
          <button
            className="icon-btn"
            title={previewScheme === 'dark' ? 'Editar no modo claro' : 'Ver o site no modo escuro'}
            onClick={() => useEditor.getState().setPreviewScheme(previewScheme === 'dark' ? 'light' : 'dark')}
          >
            <Icon name={previewScheme === 'dark' ? 'sun' : 'moon'} />
          </button>
        )}
      </div>

      <div className="ed-topbar-right">
        <UiThemeButton />
        <button className="icon-btn" disabled={!canUndo} onClick={() => useEditor.getState().undo()} title="Desfazer (Ctrl+Z)">
          <Icon name="undo" />
        </button>
        <button className="icon-btn" disabled={!canRedo} onClick={() => useEditor.getState().redo()} title="Refazer (Ctrl+Y)">
          <Icon name="redo" />
        </button>
        <button
          className="btn btn-ghost-dark"
          onClick={async () => {
            await saveNow();
            navigate(`/preview/${site.id}/${pageId}`);
          }}
        >
          <Icon name="play" size={16} /> Visualizar
        </button>
        <div className="menu-wrap">
          <button className="btn btn-primary" disabled={exporting} onClick={() => setExportMenu(!exportMenu)} aria-haspopup="menu" aria-expanded={exportMenu}>
            <Icon name="download" size={16} /> {exporting ? 'Exportando…' : 'Exportar'}
          </button>
          {exportMenu && (
            <div className="menu menu-export" role="menu" onMouseLeave={() => setExportMenu(false)}>
              <button role="menuitem" onClick={() => runExport('wp')}>
                <Icon name="wordpress" size={16} />
                <span>
                  <strong>Tema WordPress</strong>
                  <em>Arquivo .zip para Aparência → Temas</em>
                </span>
              </button>
              <button role="menuitem" onClick={() => runExport('plugin')}>
                <Icon name="plugin" size={16} />
                <span>
                  <strong>Plugin Website Builder Suite</strong>
                  <em>Formulários e seções livres no WordPress</em>
                </span>
              </button>
              <hr />
              <button role="menuitem" onClick={() => runExport('html')}>
                <Icon name="download" size={16} />
                <span>
                  <strong>Site estático (HTML)</strong>
                  <em>Para qualquer hospedagem, sem WordPress</em>
                </span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
