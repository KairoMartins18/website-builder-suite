import { useState } from 'react';
import { useEditor } from '../store/editor';
import { navigate } from '../lib/router';
import { Icon } from '../components/Icon';
import { saveNow } from './save';
import { updateSite } from './actions';
import { exportSite } from '../lib/exportActions';
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

  const exportZip = async () => {
    setExporting(true);
    try {
      await saveNow();
      await exportSite(useEditor.getState().site!);
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
        <div className="seg seg-dark">
          <button className={device === 'desktop' ? 'is-active' : ''} onClick={() => setDevice('desktop')} title="Computador">
            <Icon name="desktop" size={17} />
          </button>
          <button className={device === 'mobile' ? 'is-active' : ''} onClick={() => setDevice('mobile')} title="Celular">
            <Icon name="mobile" size={17} />
          </button>
        </div>
      </div>

      <div className="ed-topbar-right">
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
        <button className="btn btn-primary" disabled={exporting} onClick={exportZip} title="Baixar o site como arquivos HTML (.zip)">
          <Icon name="download" size={16} /> {exporting ? 'Exportando…' : 'Exportar'}
        </button>
      </div>
    </header>
  );
}
