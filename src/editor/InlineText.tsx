import { useLayoutEffect, useRef } from 'react';
import type React from 'react';
import { useEditor } from '../store/editor';
import { ELEMENTS } from '../elements/registry';
import type { ElementLike } from '../render/ElementContent';
import { Icon } from '../components/Icon';
import { isDialogOpen, promptDialog } from '../components/Dialogs';

const escapeHtml = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** Barra de formatação exibida durante a edição de texto. */
export function TextToolbar() {
  const cmd = (name: string, value?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(name, false, value);
  };
  return (
    <>
      <button title="Negrito (Ctrl+B)" onMouseDown={cmd('bold')}>
        <b>B</b>
      </button>
      <button title="Itálico (Ctrl+I)" onMouseDown={cmd('italic')}>
        <i>I</i>
      </button>
      <button title="Sublinhado (Ctrl+U)" onMouseDown={cmd('underline')}>
        <u>U</u>
      </button>
      <button
        title="Inserir link"
        onMouseDown={async (e) => {
          e.preventDefault();
          // O diálogo tira o foco do texto: guardamos a seleção para restaurá-la depois.
          const sel = window.getSelection();
          const range = sel && sel.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
          const url = await promptDialog({ title: 'Inserir link', placeholder: 'https://...', confirmLabel: 'Inserir' });
          const node = document.querySelector<HTMLElement>('.ed-inline-editor');
          if (!node) return;
          node.focus();
          if (range) {
            sel!.removeAllRanges();
            sel!.addRange(range);
          }
          if (url) document.execCommand('createLink', false, /^(https?:|mailto:|tel:|#)/i.test(url) ? url : `https://${url}`);
        }}
      >
        <Icon name="link" />
      </button>
      <button title="Limpar formatação" onMouseDown={cmd('removeFormat')}>
        T<sub>x</sub>
      </button>
      <span className="ed-el-toolbar-label">Esc para concluir</span>
    </>
  );
}

/**
 * Editor de texto no próprio canvas. Toda a edição vira um único passo de desfazer.
 * `onCommit` recebe o HTML (títulos/textos) ou o rótulo puro (botões).
 */
export function InlineTextEditor({ el, onCommit, onInput }: { el: ElementLike; onCommit: (value: string) => void; onInput?: (box: HTMLElement) => void }) {
  const ref = useRef<HTMLElement>(null);
  const kind = ELEMENTS[el.type].inlineText!;
  const done = useRef(false);

  useLayoutEffect(() => {
    const node = ref.current!;
    node.innerHTML = kind === 'html' ? el.props.html ?? '' : escapeHtml(el.props.label ?? '');
    node.focus();
    const range = document.createRange();
    range.selectNodeContents(node);
    const sel = window.getSelection()!;
    sel.removeAllRanges();
    sel.addRange(range);
    useEditor.getState().beginGesture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const commit = () => {
    if (done.current) return;
    done.current = true;
    const node = ref.current;
    const st = useEditor.getState();
    if (node) onCommit(kind === 'html' ? node.innerHTML : node.innerText.replace(/\s+/g, ' ').trim());
    st.endGesture(true);
    st.setEditingText(null);
  };

  const Tag = (el.type === 'heading' ? `h${el.props.level ?? 2}` : el.type === 'button' ? 'span' : 'div') as 'div';
  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement>}
      className={`${el.type === 'heading' ? 'wb-heading' : el.type === 'text' ? 'wb-text' : ''} ed-inline-editor`}
      contentEditable
      suppressContentEditableWarning
      onBlur={() => {
        if (!isDialogOpen()) commit();
      }}
      onInput={() => ref.current?.parentElement && onInput?.(ref.current.parentElement)}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape' || (e.key === 'Enter' && kind === 'label')) {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
      onPaste={(e) => {
        e.preventDefault();
        document.execCommand('insertText', false, e.clipboardData.getData('text/plain'));
      }}
    />
  );
}
