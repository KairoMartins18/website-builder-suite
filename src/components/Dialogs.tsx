import { useEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { Icon } from './Icon';

// Diálogos próprios: `prompt()` não existe no Electron e `confirm()` nativo destoa da interface.

interface DialogRequest {
  kind: 'prompt' | 'confirm';
  title: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  extra?: { label: string; onClick: () => void };
  resolve: (value: string | boolean | null) => void;
}

const useDialogs = create<{ current: DialogRequest | null }>(() => ({ current: null }));

function open(req: Omit<DialogRequest, 'resolve'>): Promise<string | boolean | null> {
  return new Promise((resolve) => {
    const prev = useDialogs.getState().current;
    prev?.resolve(prev.kind === 'prompt' ? null : false);
    useDialogs.setState({ current: { ...req, resolve } });
  });
}

/** Ativo enquanto um diálogo está aberto (o editor de texto inline usa para não perder a edição). */
export const isDialogOpen = () => useDialogs.getState().current !== null;

export function promptDialog(opts: { title: string; message?: string; defaultValue?: string; placeholder?: string; confirmLabel?: string }): Promise<string | null> {
  return open({ kind: 'prompt', confirmLabel: 'OK', cancelLabel: 'Cancelar', ...opts }) as Promise<string | null>;
}

export function confirmDialog(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  extra?: { label: string; onClick: () => void };
}): Promise<boolean> {
  return open({ kind: 'confirm', confirmLabel: 'Confirmar', cancelLabel: 'Cancelar', ...opts }) as Promise<boolean>;
}

export function DialogHost() {
  const req = useDialogs((s) => s.current);
  if (!req) return null;
  return <DialogView key={Math.random()} req={req} />;
}

function DialogView({ req }: { req: DialogRequest }) {
  const [value, setValue] = useState(req.defaultValue ?? '');
  const inputRef = useRef<HTMLInputElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const close = (result: string | boolean | null) => {
    useDialogs.setState({ current: null });
    req.resolve(result);
  };
  const cancel = () => close(req.kind === 'prompt' ? null : false);
  const ok = () => close(req.kind === 'prompt' ? value.trim() || null : true);

  useEffect(() => {
    if (req.kind === 'prompt') inputRef.current?.select();
    else okRef.current?.focus();
  }, [req.kind]);

  return (
    <div className="modal-backdrop" onMouseDown={cancel}>
      <div
        className="modal modal-sm"
        role="dialog"
        aria-modal
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') cancel();
          if (e.key === 'Enter' && req.kind === 'prompt') ok();
        }}
      >
        <div className="modal-head">
          <h2>{req.title}</h2>
          <button className="icon-btn" onClick={cancel} title="Fechar">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          {req.message && <p className="dialog-message">{req.message}</p>}
          {req.kind === 'prompt' && (
            <input ref={inputRef} className="input input-lg" value={value} placeholder={req.placeholder} onChange={(e) => setValue(e.target.value)} />
          )}
        </div>
        <div className="modal-foot">
          {req.extra && (
            <button
              className="btn btn-ghost"
              style={{ marginRight: 'auto' }}
              onClick={() => {
                req.extra!.onClick();
                cancel();
              }}
            >
              {req.extra.label}
            </button>
          )}
          <button className="btn btn-ghost" onClick={cancel}>
            {req.cancelLabel}
          </button>
          <button ref={okRef} className={`btn ${req.danger ? 'btn-danger-solid' : 'btn-primary'}`} onClick={ok}>
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export async function alertDialog(title: string, message?: string): Promise<void> {
  await open({ kind: 'confirm', title, message, confirmLabel: 'OK', cancelLabel: 'Fechar' });
}
