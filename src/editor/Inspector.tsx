import type { ElementStyle, Link, Page, Section, Site, SiteElement } from '../types';
import { useEditor } from '../store/editor';
import { findElement, findSection, uniqueSlug } from '../lib/siteOps';
import { elementGeom, sectionHeight } from '../lib/layout';
import { pickImages } from '../lib/images';
import { ELEMENTS, type FieldDef } from '../elements/registry';
import {
  ColorInput,
  Field,
  FontSelect,
  Group,
  ImageInput,
  NumberInput,
  Row,
  Segmented,
  Select,
  Slider,
  TextInput,
  Toggle,
} from '../components/fields';
import { Icon } from '../components/Icon';
import { confirmDeletePage, confirmDeleteSection } from './confirmations';
import {
  arrangeElement,
  deleteElement,
  duplicateElement,
  duplicateSection,
  freezeMobile,
  resetMobileLayout,
  setGeom,
  updateElement,
  updatePage,
  updateSection,
  updateSite,
} from './actions';

export function Inspector() {
  const site = useEditor((s) => s.site)!;
  const selection = useEditor((s) => s.selection);
  const pageId = useEditor((s) => s.pageId);

  let body;
  if (selection?.kind === 'element') {
    const f = findElement(site, selection.id);
    if (f) body = <ElementInspector el={f.element} section={f.section} site={site} />;
  } else if (selection?.kind === 'section') {
    const s = findSection(site, selection.id);
    if (s) body = <SectionInspector section={s} site={site} />;
  }
  if (!body) {
    const page = site.pages.find((p) => p.id === pageId);
    body = page ? <PageInspector page={page} site={site} /> : null;
  }
  return <aside className="ed-inspector">{body}</aside>;
}

function InspectorHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="insp-head">
      <div className="insp-title">{title}</div>
      {subtitle && <div className="insp-sub">{subtitle}</div>}
    </div>
  );
}

// ---------------- Elemento ----------------

function ElementInspector({ el, section, site }: { el: SiteElement; section: Section; site: Site }) {
  const device = useEditor((s) => s.device);
  const def = ELEMENTS[el.type];
  const g = elementGeom(section, el, device);
  const theme = site.theme;
  const setProp = (key: string, value: unknown) => updateElement(el.id, (d) => void (d.props[key] = value), `p.${key}`);
  const setStyle = <K extends keyof ElementStyle>(key: K, value: ElementStyle[K]) =>
    updateElement(
      el.id,
      (d) => {
        if (value === undefined) delete d.style[key];
        else d.style[key] = value;
      },
      `s.${key}`,
    );
  const s = el.style;

  return (
    <>
      <InspectorHeader title={el.name || def.label} subtitle={device === 'mobile' ? 'Editando a versão para celular' : undefined} />

      {(def.fields.length > 0 || def.linkable) && (
        <Group title="Conteúdo">
          {def.inlineText === 'html' && <p className="hint">Clique duas vezes no elemento para editar o texto.</p>}
          {def.fields.map((f) => (
            <PropField key={f.key} field={f} value={el.props[f.key]} onChange={(v) => setProp(f.key, v)} site={site} />
          ))}
          {def.linkable && <LinkEditor link={el.link} site={site} onChange={(link) => updateElement(el.id, (d) => void (link ? (d.link = link) : delete d.link), 'link')} />}
        </Group>
      )}

      {def.typography && (
        <Group title="Texto">
          <Field label="Fonte">
            <FontSelect value={s.fontFamily} theme={theme} onChange={(v) => setStyle('fontFamily', v)} />
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
            <ColorInput value={s.color} theme={theme} onChange={(v) => setStyle('color', v)} />
          </Field>
        </Group>
      )}

      {el.type === 'line' && (
        <Group title="Linha">
          <Field label="Cor">
            <ColorInput value={s.borderColor} theme={theme} allowNone={false} onChange={(v) => setStyle('borderColor', v)} />
          </Field>
          <Row>
            <Field label="Espessura">
              <NumberInput value={s.borderWidth ?? 2} min={1} max={40} suffix="px" onChange={(v) => setStyle('borderWidth', v)} />
            </Field>
            <Field label="Estilo">
              <Select
                value={s.borderStyle ?? 'solid'}
                options={[
                  { value: 'solid', label: 'Contínua' },
                  { value: 'dashed', label: 'Tracejada' },
                  { value: 'dotted', label: 'Pontilhada' },
                ]}
                onChange={(v) => setStyle('borderStyle', v)}
              />
            </Field>
          </Row>
        </Group>
      )}

      {def.box && (
        <Group title="Aparência">
          <Field label="Fundo">
            <ColorInput value={s.background} theme={theme} onChange={(v) => setStyle('background', v)} />
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
                <ColorInput value={s.borderColor} theme={theme} allowNone={false} onChange={(v) => setStyle('borderColor', v)} />
              </Field>
              <Field label="Estilo da borda">
                <Select
                  value={s.borderStyle ?? 'solid'}
                  options={[
                    { value: 'solid', label: 'Contínua' },
                    { value: 'dashed', label: 'Tracejada' },
                    { value: 'dotted', label: 'Pontilhada' },
                  ]}
                  onChange={(v) => setStyle('borderStyle', v)}
                />
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
        </Group>
      )}

      <Group title={device === 'mobile' ? 'Posição no celular' : 'Posição e tamanho'}>
        <Row>
          <Field label="X">
            <NumberInput value={g.x} onChange={(v) => setGeom(el.id, { x: v }, { key: `geom:${el.id}:x` })} />
          </Field>
          <Field label="Y">
            <NumberInput value={g.y} onChange={(v) => setGeom(el.id, { y: v }, { key: `geom:${el.id}:y` })} />
          </Field>
        </Row>
        <Row>
          <Field label="Largura">
            <NumberInput value={g.w} min={8} onChange={(v) => setGeom(el.id, { w: v }, { key: `geom:${el.id}:w` })} />
          </Field>
          <Field label="Altura">
            <NumberInput value={g.h} min={8} onChange={(v) => setGeom(el.id, { h: v }, { key: `geom:${el.id}:h` })} />
          </Field>
        </Row>
        <Field label="Nome na lista de camadas">
          <TextInput value={el.name} placeholder={def.label} onChange={(v) => updateElement(el.id, (d) => void (v ? (d.name = v) : delete d.name), 'name')} />
        </Field>
        <Toggle
          label="Ocultar no celular"
          checked={!!el.mobileHidden}
          onChange={(v) =>
            updateElement(el.id, (d) => {
              if (v) d.mobileHidden = true;
              else delete d.mobileHidden;
            })
          }
        />
        <Toggle label="Bloquear posição" checked={!!el.locked} onChange={(v) => updateElement(el.id, (d) => void (v ? (d.locked = true) : delete d.locked))} />
        <div className="btn-row">
          <button className="btn btn-sm" title="Trazer para a frente" onClick={() => arrangeElement(el.id, 'front')}>
            Frente
          </button>
          <button className="btn btn-sm" title="Enviar para trás de tudo" onClick={() => arrangeElement(el.id, 'back')}>
            Fundo
          </button>
          <button className="btn btn-sm" onClick={() => duplicateElement(el.id)}>
            Duplicar
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => deleteElement(el.id)}>
            Excluir
          </button>
        </div>
      </Group>
    </>
  );
}

function PropField({ field, value, onChange, site }: { field: FieldDef; value: unknown; onChange: (v: unknown) => void; site: Site }) {
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
          <input className="input" value={f.label} onChange={(e) => update(i, { label: e.target.value })} />
          <select className="input" value={f.type} onChange={(e) => update(i, { type: e.target.value })}>
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

// ---------------- Seção ----------------

function SectionInspector({ section, site }: { section: Section; site: Site }) {
  const device = useEditor((s) => s.device);
  const bg = section.background;
  const setBg = <K extends keyof Section['background']>(key: K, value: Section['background'][K]) =>
    updateSection(
      section.id,
      (d) => {
        if (value === undefined || value === false) delete d.background[key];
        else d.background[key] = value;
      },
      `bg.${key}`,
    );
  const kindLabel = section.kind === 'header' ? 'Cabeçalho' : section.kind === 'footer' ? 'Rodapé' : 'Seção';

  return (
    <>
      <InspectorHeader title={section.kind === 'body' ? section.name : kindLabel} subtitle={section.kind !== 'body' ? 'Compartilhado por todas as páginas' : undefined} />
      <Group title="Geral">
        {section.kind === 'body' && (
          <Field label="Nome">
            <TextInput value={section.name} onChange={(v) => updateSection(section.id, (d) => void (d.name = v), 'name')} />
          </Field>
        )}
        <Field label={device === 'mobile' ? 'Altura no celular' : 'Altura'}>
          <NumberInput
            value={sectionHeight(section, device)}
            min={40}
            suffix="px"
            onChange={(v) => {
              if (device === 'mobile') {
                freezeMobile(section.id);
                updateSection(section.id, (d) => void (d.mobileHeight = Math.round(v)), 'mh');
              } else updateSection(section.id, (d) => void (d.height = Math.round(v)), 'h');
            }}
          />
        </Field>
        {section.kind === 'header' && (
          <Toggle label="Fixar no topo ao rolar" checked={!!section.sticky} onChange={(v) => updateSection(section.id, (d) => void (v ? (d.sticky = true) : delete d.sticky))} />
        )}
      </Group>
      <Group title="Fundo">
        <Field label="Cor">
          <ColorInput value={bg.color} theme={site.theme} onChange={(v) => setBg('color', v)} />
        </Field>
        <Field label="Imagem">
          <ImageInput value={bg.image} onChange={(v) => setBg('image', v)} />
        </Field>
        {bg.image && (
          <>
            <Row>
              <Field label="Ajuste">
                <Select
                  value={bg.size ?? 'cover'}
                  options={[
                    { value: 'cover', label: 'Preencher' },
                    { value: 'contain', label: 'Ajustar' },
                    { value: 'auto', label: 'Repetir' },
                  ]}
                  onChange={(v) => setBg('size', v)}
                />
              </Field>
              <Field label="Posição">
                <Select
                  value={bg.position ?? 'center'}
                  options={[
                    { value: 'center', label: 'Centro' },
                    { value: 'top', label: 'Topo' },
                    { value: 'bottom', label: 'Base' },
                    { value: 'left', label: 'Esquerda' },
                    { value: 'right', label: 'Direita' },
                  ]}
                  onChange={(v) => setBg('position', v)}
                />
              </Field>
            </Row>
            <Toggle label="Efeito parallax (fundo fixo)" checked={!!bg.fixed} onChange={(v) => setBg('fixed', v)} />
          </>
        )}
        <Field label="Camada de cor sobre o fundo">
          <ColorInput value={bg.overlay} theme={site.theme} onChange={(v) => setBg('overlay', v)} />
        </Field>
        {bg.overlay && !bg.overlay.startsWith('rgba') && <p className="hint">Dica: use rgba(0,0,0,0.4) para uma camada semitransparente.</p>}
      </Group>
      <Group title="Celular">
        <Toggle
          label="Ocultar seção no celular"
          checked={!!section.mobileHidden}
          onChange={(v) => updateSection(section.id, (d) => void (v ? (d.mobileHidden = true) : delete d.mobileHidden))}
        />
        {section.mobileFrozen ? (
          <>
            <p className="hint">O layout para celular desta seção foi ajustado manualmente.</p>
            <button className="btn btn-sm" onClick={() => resetMobileLayout(section.id)}>
              Restaurar layout automático
            </button>
          </>
        ) : (
          <p className="hint">O layout para celular é gerado automaticamente. Mude para o modo celular na barra superior para ajustá-lo.</p>
        )}
      </Group>
      {section.kind === 'body' && (
        <div className="btn-row insp-actions">
          <button className="btn btn-sm" onClick={() => duplicateSection(section.id)}>
            Duplicar seção
          </button>
          <button className="btn btn-sm btn-danger" onClick={() => void confirmDeleteSection(section)}>
            Excluir
          </button>
        </div>
      )}
    </>
  );
}

// ---------------- Página e site ----------------

function PageInspector({ page, site }: { page: Page; site: Site }) {
  const isHome = page.id === site.homePageId;
  return (
    <>
      <InspectorHeader title={page.name} subtitle={isHome ? 'Página inicial' : `/${page.slug}`} />
      <p className="hint insp-pad">Selecione um elemento ou seção no canvas para editar suas propriedades.</p>
      <Group title="Página">
        <Field label="Nome">
          <TextInput value={page.name} onChange={(v) => updatePage(page.id, (d) => void (d.name = v), 'name')} />
        </Field>
        {!isHome && (
          <Field label="Endereço (URL)">
            <TextInput
              value={page.slug}
              onChange={(v) => updatePage(page.id, (d) => void (d.slug = uniqueSlug(site, v, page.id)), "slug")}
            />
          </Field>
        )}
        <Toggle label="Ocultar do menu" checked={!!page.hideFromMenu} onChange={(v) => updatePage(page.id, (d) => void (v ? (d.hideFromMenu = true) : delete d.hideFromMenu))} />
        <div className="btn-row">
          {!isHome && (
            <button className="btn btn-sm" onClick={() => updateSite((d) => void (d.homePageId = page.id))}>
              <Icon name="home" size={14} /> Definir como inicial
            </button>
          )}
          {site.pages.length > 1 && (
            <button className="btn btn-sm btn-danger" onClick={() => void confirmDeletePage(page)}>
              Excluir página
            </button>
          )}
        </div>
      </Group>
      <Group title="SEO (Google)">
        <Field label="Título da página">
          <TextInput value={page.seo.title} placeholder={isHome ? site.name : `${page.name} | ${site.name}`} onChange={(v) => updatePage(page.id, (d) => void (d.seo.title = v), 'seo.t')} />
        </Field>
        <Field label="Descrição">
          <TextInput multiline rows={3} value={page.seo.description} placeholder="Resumo da página exibido nos resultados de busca" onChange={(v) => updatePage(page.id, (d) => void (d.seo.description = v), 'seo.d')} />
        </Field>
        <div className="seo-preview">
          <div className="seo-preview-title">{page.seo.title || (isHome ? site.name : `${page.name} | ${site.name}`)}</div>
          <div className="seo-preview-url">{isHome ? 'seusite.com' : `seusite.com/${page.slug}`}</div>
          <div className="seo-preview-desc">{page.seo.description || 'Adicione uma descrição para aparecer aqui.'}</div>
        </div>
      </Group>
      <Group title="Site" defaultOpen={false}>
        <Field label="Nome do site">
          <TextInput value={site.name} onChange={(v) => updateSite((d) => void (d.name = v), 'site.name')} />
        </Field>
        <Field label="Ícone da aba (favicon)">
          <ImageInput value={site.settings.favicon} onChange={(v) => updateSite((d) => void (v ? (d.settings.favicon = v) : delete d.settings.favicon))} />
        </Field>
      </Group>
    </>
  );
}

