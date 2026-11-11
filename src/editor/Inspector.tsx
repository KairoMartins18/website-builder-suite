import type { ElementStyle, Page, Section, Site, SiteElement } from '../types';
import { useEditor } from '../store/editor';
import { findElement, findSection, uniqueSlug } from '../lib/siteOps';
import { elementGeom, sectionHeight } from '../lib/layout';
import { ELEMENTS } from '../elements/registry';
import { findNode, isFlow } from '../lib/flow';
import { BoxGroup, ContentGroup, InspectorHeader, LineGroup, TypographyGroup } from './inspector/groups';
import { ContainerControls, ContainerInspector, WidgetInspector } from './inspector/FlowInspector';
import {
  ColorInput,
  Field,
  Group,
  ImageInput,
  NumberInput,
  Row,
  Select,
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
  } else if (selection?.kind === 'node') {
    const loc = findNode(site, selection.id);
    if (loc) body = loc.node.kind === 'widget' ? <WidgetInspector node={loc.node} site={site} /> : <ContainerInspector node={loc.node} site={site} />;
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


// ---------------- Elemento (seção livre) ----------------

function ElementInspector({ el, section, site }: { el: SiteElement; section: Section; site: Site }) {
  const device = useEditor((s) => s.device);
  const def = ELEMENTS[el.type];
  const g = elementGeom(section, el, device);
  const setStyle = <K extends keyof ElementStyle>(key: K, value: ElementStyle[K]) =>
    updateElement(
      el.id,
      (d) => {
        if (value === undefined) delete d.style[key];
        else d.style[key] = value;
      },
      `s.${key}`,
    );
  const common = { type: el.type, style: el.style, setStyle, site };

  return (
    <>
      <InspectorHeader title={el.name || def.label} subtitle={device === 'mobile' ? 'Editando a versão para celular' : 'Elemento em seção livre'} />
      <ContentGroup
        type={el.type}
        props={el.props}
        link={el.link}
        site={site}
        setProp={(key, value) => updateElement(el.id, (d) => void (d.props[key] = value), `p.${key}`)}
        setLink={(link) => updateElement(el.id, (d) => void (link ? (d.link = link) : delete d.link), 'link')}
      />
      {def.typography && <TypographyGroup {...common} />}
      {el.type === 'line' && <LineGroup {...common} />}
      {def.box && <BoxGroup {...common} />}

      <Group title={device === 'mobile' ? 'Posição no celular' : 'Posição e tamanho'}>
        {device === 'tablet' ? (
          <p className="hint">Seções livres usam o layout de computador reduzido no tablet. Mude para computador ou celular para mover este elemento.</p>
        ) : (
          <>
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
          </>
        )}
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
        {!isFlow(section) && (
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
        )}
        {section.kind === 'header' && (
          <Toggle label="Fixar no topo ao rolar" checked={!!section.sticky} onChange={(v) => updateSection(section.id, (d) => void (v ? (d.sticky = true) : delete d.sticky))} />
        )}
      </Group>
      {isFlow(section) && <ContainerControls node={section.root} device={device} root />}
      <Group title="Fundo">
        <Field label="Cor">
          <ColorInput value={bg.color} theme={site.theme} onChange={(v) => setBg('color', v)} />
        </Field>
        <Field label="Degradê (CSS)">
          <TextInput value={bg.gradient} placeholder="linear-gradient(135deg, #667eea, #764ba2)" onChange={(v) => setBg('gradient', v || undefined)} />
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
        {site.settings.darkMode && site.settings.darkMode !== 'off' && (
          <>
            <Field label="Cor de fundo no modo escuro">
              <ColorInput
                value={bg.dark?.color}
                theme={site.theme}
                onChange={(v) => updateSection(section.id, (d) => void (d.background.dark = { ...d.background.dark, color: v }), 'bg.dark.color')}
              />
            </Field>
            <Field label="Degradê no modo escuro (CSS)">
              <TextInput
                value={bg.dark?.gradient}
                placeholder="linear-gradient(135deg, #1b1640, #0b0a1f)"
                onChange={(v) => updateSection(section.id, (d) => void (d.background.dark = { ...d.background.dark, gradient: v || undefined }), 'bg.dark.grad')}
              />
            </Field>
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
        {isFlow(section) ? (
          <p className="hint">Seção com containers: selecione um container e mude para tablet/celular na barra superior para ajustar a direção, os espaçamentos e o que aparece em cada tela.</p>
        ) : section.mobileFrozen ? (
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
      <InspectorHeader
        title={page.name}
        subtitle={page.role === 'post' ? 'Modelo usado para exibir cada post' : page.role === 'blog' ? 'Página de posts (blog)' : isHome ? 'Página inicial' : `/${page.slug}`}
      />
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

