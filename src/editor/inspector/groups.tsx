// Grupos de controles compartilhados entre elementos livres e widgets de container.
import type { ElementStyle, ElementType, Link, Site } from '../../types';
import { pickImages } from '../../lib/images';
import { ELEMENTS, type FieldDef } from '../../elements/registry';
import { ColorInput, Field, FontSelect, Group, ImageInput, NumberInput, Row, Segmented, Select, Slider, TextInput, Toggle } from '../../components/fields';
import { Icon } from '../../components/Icon';

export function InspectorHeader({ title, subtitle, badge }: { title: string; subtitle?: string; badge?: string }) {
  return (
    <div className="insp-head">
      <div className="insp-title">
        {title}
        {badge && <span className="insp-badge">{badge}</span>}
      </div>
      {subtitle && <div className="insp-sub">{subtitle}</div>}
    </div>
  );
}

/** Interface comum: quem usa decide como gravar (elemento livre ou widget por breakpoint). */
export interface StyleEditorProps {
  type: ElementType;
  style: ElementStyle;
  setStyle: <K extends keyof ElementStyle>(key: K, value: ElementStyle[K]) => void;
  site: Site;
}

export function ContentGroup({
  type,
  props,
  link,
  setProp,
  setLink,
  site,
}: {
  type: ElementType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: Record<string, any>;
  link?: Link;
  setProp: (key: string, value: unknown) => void;
  setLink: (l: Link | undefined) => void;
  site: Site;
}) {
  const def = ELEMENTS[type];
  if (!def.fields.length && !def.linkable && !def.inlineText && !def.wpOnly) return null;
  return (
    <Group title="Conteúdo">
      {def.wpOnly && <p className="hint hint-wp">WordPress: {def.wpOnly}</p>}
      {def.inlineText === 'html' && <p className="hint">Clique duas vezes no elemento para editar o texto.</p>}
      {def.fields.map((f) => (
        <PropField key={f.key} field={f} value={props[f.key]} onChange={(v) => setProp(f.key, v)} site={site} />
      ))}
      {type === 'image' && props.src && !props.alt && (
        <p className="hint hint-warn">♿ Descreva a imagem em “Texto alternativo” para que leitores de tela possam anunciá-la (ou deixe vazio se for só decorativa).</p>
      )}
      {def.linkable && <LinkEditor link={link} site={site} onChange={setLink} />}
    </Group>
  );
}

export function TypographyGroup({ style: s, setStyle, site }: StyleEditorProps) {
  return (
    <Group title="Texto">
      <Field label="Fonte">
        <FontSelect value={s.fontFamily} theme={site.theme} onChange={(v) => setStyle('fontFamily', v)} />
      </Field>
      <Row>
        <Field label="Tamanho">
          <NumberInput value={s.fontSize} min={6} max={300} suffix="px" onChange={(v) => setStyle('fontSize', v)} />
        </Field>
        <Field label="Peso">
          <Select
            value={s.fontWeight ?? 400}
            options={[300, 400, 500, 600, 700, 800, 900].map((w) => ({ value: w, label: String(w) }))}
            onChange={(v) => setStyle('fontWeight', v)}
          />
        </Field>
      </Row>
      <Field label="Alinhamento">
        <Segmented
          value={s.textAlign ?? 'left'}
          onChange={(v) => setStyle('textAlign', v)}
          options={[
            { value: 'left', label: <Icon name="alignLeft" size={16} />, title: 'Esquerda' },
            { value: 'center', label: <Icon name="alignCenter" size={16} />, title: 'Centro' },
            { value: 'right', label: <Icon name="alignRight" size={16} />, title: 'Direita' },
            { value: 'justify', label: <Icon name="alignJustify" size={16} />, title: 'Justificado' },
          ]}
        />
      </Field>
      <Row>
        <Field label="Altura da linha">
          <NumberInput value={s.lineHeight} min={0.8} max={3} step={0.1} onChange={(v) => setStyle('lineHeight', v)} />
        </Field>
        <Field label="Espaçamento">
          <NumberInput value={s.letterSpacing ?? 0} min={-5} max={20} step={0.5} suffix="px" onChange={(v) => setStyle('letterSpacing', v)} />
        </Field>
      </Row>
      <Row>
        <Toggle label="Itálico" checked={s.fontStyle === 'italic'} onChange={(v) => setStyle('fontStyle', v ? 'italic' : undefined)} />
        <Toggle label="MAIÚSCULAS" checked={s.textTransform === 'uppercase'} onChange={(v) => setStyle('textTransform', v ? 'uppercase' : undefined)} />
      </Row>
      <Field label="Cor do texto">
        <ColorInput value={s.color} theme={site.theme} onChange={(v) => setStyle('color', v)} />
      </Field>
    </Group>
  );
}

const BORDER_STYLES = [
  { value: 'solid' as const, label: 'Contínua' },
  { value: 'dashed' as const, label: 'Tracejada' },
  { value: 'dotted' as const, label: 'Pontilhada' },
];

export function LineGroup({ style: s, setStyle, site }: StyleEditorProps) {
  return (
    <Group title="Linha">
      <Field label="Cor">
        <ColorInput value={s.borderColor} theme={site.theme} allowNone={false} onChange={(v) => setStyle('borderColor', v)} />
      </Field>
      <Row>
        <Field label="Espessura">
          <NumberInput value={s.borderWidth ?? 2} min={1} max={40} suffix="px" onChange={(v) => setStyle('borderWidth', v)} />
        </Field>
        <Field label="Estilo">
          <Select value={s.borderStyle ?? 'solid'} options={BORDER_STYLES} onChange={(v) => setStyle('borderStyle', v)} />
        </Field>
      </Row>
    </Group>
  );
}

export function BoxGroup({ style: s, setStyle, site, title = 'Aparência' }: StyleEditorProps & { title?: string }) {
  return (
    <Group title={title}>
      <Field label="Fundo">
        <ColorInput value={s.background} theme={site.theme} onChange={(v) => setStyle('background', v)} />
      </Field>
      <Row>
        <Field label="Borda">
          <NumberInput value={s.borderWidth ?? 0} min={0} max={40} suffix="px" onChange={(v) => setStyle('borderWidth', v || undefined)} />
        </Field>
        <Field label="Cantos">
          <NumberInput value={s.borderRadius ?? 0} min={0} max={9999} suffix="px" onChange={(v) => setStyle('borderRadius', v || undefined)} />
        </Field>
      </Row>
      {!!s.borderWidth && (
        <>
          <Field label="Cor da borda">
            <ColorInput value={s.borderColor} theme={site.theme} allowNone={false} onChange={(v) => setStyle('borderColor', v)} />
          </Field>
          <Field label="Estilo da borda">
            <Select value={s.borderStyle ?? 'solid'} options={BORDER_STYLES} onChange={(v) => setStyle('borderStyle', v)} />
          </Field>
        </>
      )}
      <Row>
        <Field label="Sombra">
          <Select
            value={s.shadow ?? 'none'}
            options={[
              { value: 'none', label: 'Nenhuma' },
              { value: 'sm', label: 'Suave' },
              { value: 'md', label: 'Média' },
              { value: 'lg', label: 'Forte' },
            ]}
            onChange={(v) => setStyle('shadow', v === 'none' ? undefined : v)}
          />
        </Field>
        <Field label="Espaço interno">
          <NumberInput value={s.padding ?? 0} min={0} max={200} suffix="px" onChange={(v) => setStyle('padding', v || undefined)} />
        </Field>
      </Row>
      <Field label="Opacidade">
        <Slider value={s.opacity ?? 1} min={0} max={1} step={0.05} onChange={(v) => setStyle('opacity', v >= 1 ? undefined : v)} />
      </Field>
      <Field label="Efeito vidro (desfoque do fundo)">
        <Slider value={s.backdropBlur ?? 0} min={0} max={40} step={1} onChange={(v) => setStyle('backdropBlur', v || undefined)} />
      </Field>
      {!!s.backdropBlur && <p className="hint">Funciona com fundo semitransparente, ex.: rgba(255,255,255,0.15).</p>}
    </Group>
  );
}

export function PropField({ field, value, onChange, site }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; site: Site }) {
  switch (field.kind) {
    case 'text':
      return (
        <Field label={field.label}>
          <TextInput value={value as string} placeholder={field.placeholder} onChange={onChange} />
        </Field>
      );
    case 'textarea':
    case 'code':
      return (
        <Field label={field.label}>
          <TextInput value={value as string} onChange={onChange} multiline rows={field.kind === 'code' ? 8 : 4} mono={field.kind === 'code'} />
        </Field>
      );
    case 'number':
      return (
        <Field label={field.label}>
          <NumberInput value={value as number} min={field.min} max={field.max} onChange={onChange} />
        </Field>
      );
    case 'select':
      return (
        <Field label={field.label}>
          <Select value={value as string} options={field.options as { value: string; label: string }[]} onChange={onChange} />
        </Field>
      );
    case 'toggle':
      return <Toggle label={field.label} checked={!!value} onChange={onChange} />;
    case 'color':
      return (
        <Field label={field.label}>
          <ColorInput value={value as string} theme={site.theme} onChange={onChange} />
        </Field>
      );
    case 'image':
      return (
        <Field label={field.label}>
          <ImageInput value={value as string} onChange={onChange} />
        </Field>
      );
    case 'images':
      return <GalleryImagesField value={(value as { src: string; alt?: string }[]) ?? []} onChange={onChange} />;
    case 'formFields':
      return <FormFieldsEditor value={(value as FormFieldDef[]) ?? []} onChange={onChange} />;
  }
}

function GalleryImagesField({ value, onChange }: { value: { src: string; alt?: string }[]; onChange: (v: unknown) => void }) {
  return (
    <div className="field">
      <span className="field-label">Imagens ({value.length})</span>
      <div className="gallery-edit">
        {value.map((img, i) => (
          <div key={i} className="gallery-edit-item" style={{ backgroundImage: `url("${img.src}")` }}>
            <button title="Remover" onClick={() => onChange(value.filter((_, j) => j !== i))}>
              <Icon name="close" size={12} />
            </button>
            {i > 0 && (
              <button
                className="gallery-edit-left"
                title="Mover para a esquerda"
                onClick={() => {
                  const next = [...value];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  onChange(next);
                }}
              >
                <Icon name="back" size={12} />
              </button>
            )}
          </div>
        ))}
        <button
          className="gallery-edit-add"
          title="Adicionar imagens"
          onClick={async () => {
            const imgs = await pickImages(true);
            if (imgs.length) onChange([...value, ...imgs.map((src) => ({ src, alt: '' }))]);
          }}
        >
          <Icon name="plus" />
        </button>
      </div>
    </div>
  );
}

interface FormFieldDef {
  label: string;
  type: string;
  required?: boolean;
}

function FormFieldsEditor({ value, onChange }: { value: FormFieldDef[]; onChange: (v: unknown) => void }) {
  const update = (i: number, patch: Partial<FormFieldDef>) => onChange(value.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  return (
    <div className="field">
      <span className="field-label">Campos do formulário</span>
      {value.map((f, i) => (
        <div key={i} className="form-field-edit">
          <input className="input" value={f.label} aria-label="Rótulo do campo" onChange={(e) => update(i, { label: e.target.value })} />
          <select className="input" value={f.type} aria-label="Tipo do campo" onChange={(e) => update(i, { type: e.target.value })}>
            <option value="text">Texto</option>
            <option value="email">E-mail</option>
            <option value="tel">Telefone</option>
            <option value="number">Número</option>
            <option value="date">Data</option>
            <option value="textarea">Texto longo</option>
          </select>
          <label title="Obrigatório" className="form-field-req">
            <input type="checkbox" checked={!!f.required} onChange={(e) => update(i, { required: e.target.checked })} />*
          </label>
          <button className="icon-btn" title="Remover campo" onClick={() => onChange(value.filter((_, j) => j !== i))}>
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
      <button className="btn btn-sm" onClick={() => onChange([...value, { label: 'Novo campo', type: 'text', required: false }])}>
        <Icon name="plus" size={14} /> Adicionar campo
      </button>
    </div>
  );
}

function LinkEditor({ link, site, onChange }: { link: Link | undefined; site: Site; onChange: (l: Link | undefined) => void }) {
  const kind = link?.kind ?? 'none';
  return (
    <>
      <Field label="Link">
        <Select
          value={kind}
          options={[
            { value: 'none', label: 'Sem link' },
            { value: 'page', label: 'Página do site' },
            { value: 'url', label: 'Endereço web (URL)' },
            { value: 'email', label: 'E-mail' },
            { value: 'phone', label: 'Telefone' },
          ]}
          onChange={(k) => onChange(k === 'none' ? undefined : k === 'page' ? { kind: 'page', pageId: site.homePageId } : { kind: k as Link['kind'], url: '' })}
        />
      </Field>
      {link?.kind === 'page' && (
        <Field label="Página">
          <Select value={link.pageId} options={site.pages.map((p) => ({ value: p.id, label: p.name }))} onChange={(pageId) => onChange({ ...link, pageId })} />
        </Field>
      )}
      {link && link.kind !== 'page' && (
        <Field label={link.kind === 'url' ? 'URL' : link.kind === 'email' ? 'Endereço de e-mail' : 'Número de telefone'}>
          <TextInput
            value={link.url}
            placeholder={link.kind === 'url' ? 'https://...' : link.kind === 'email' ? 'nome@exemplo.com' : '+55 11 99999-9999'}
            onChange={(url) => onChange({ ...link, url })}
          />
        </Field>
      )}
      {link?.kind === 'url' && <Toggle label="Abrir em nova aba" checked={!!link.newTab} onChange={(newTab) => onChange({ ...link, newTab })} />}
    </>
  );
}
