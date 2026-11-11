// Inspector de containers e widgets (seções em fluxo), com ajustes por dispositivo.
import type { ContainerNode, ContainerProps, ContainerTag, DeviceMode, ElementStyle, FlowNode, NodeLayout, Site, WidgetNode } from '../../types';
import { useEditor } from '../../store/editor';
import { effLayout, effProps, effStyle, hasOverrides } from '../../lib/flow';
import { ELEMENTS } from '../../elements/registry';
import { Field, Group, NumberInput, Row, Segmented, Select, TextInput, Toggle } from '../../components/fields';
import { BoxGroup, ContentGroup, InspectorHeader, LineGroup, TypographyGroup } from './groups';
import { clearOverrides, deleteNode, duplicateNode, setNodeStyle, setNodeValue, updateNode, wrapInContainer } from '../flowActions';
import { labelOf, renameNode } from '../FlowEditor';

const DEVICE_LABEL: Record<DeviceMode, string> = { desktop: 'Computador', tablet: 'Tablet', mobile: 'Celular' };

/** Aviso do breakpoint em edição + botão para limpar ajustes. */
function DeviceNote({ node, device }: { node: FlowNode; device: DeviceMode }) {
  if (device === 'desktop')
    return <p className="hint insp-pad">Os ajustes feitos aqui valem para todos os dispositivos. Mude para tablet ou celular na barra superior para ajustá-los separadamente.</p>;
  return (
    <div className="insp-device-note">
      Editando a versão para <strong>{DEVICE_LABEL[device].toLowerCase()}</strong>: as mudanças valem só para ela.
      {hasOverrides(node, device) && (
        <button className="btn btn-sm" onClick={() => clearOverrides(node.id, device)}>
          Limpar ajustes do {DEVICE_LABEL[device].toLowerCase()}
        </button>
      )}
    </div>
  );
}

const setLayout = (id: string, key: keyof NodeLayout, v: unknown) => setNodeValue(id, 'layout', key, v);

/** Como o item ocupa espaço dentro do container pai. */
function ItemLayoutGroup({ node, device, isWidget }: { node: FlowNode; device: DeviceMode; isWidget: boolean }) {
  const l = effLayout(node, device);
  const widthMode = typeof l.width === 'number' ? 'pct' : l.width ?? 'auto';
  const needsHeight = node.kind === 'widget' && ['map', 'embed', 'shape', 'image', 'video'].includes(node.type);
  return (
    <Group title="Posição no container">
      <Field label="Largura">
        <Segmented
          value={widthMode}
          onChange={(v) => setLayout(node.id, 'width', v === 'pct' ? 50 : v === 'auto' ? undefined : v)}
          options={[
            { value: 'auto', label: 'Auto', title: 'Do tamanho do conteúdo' },
            { value: 'fill', label: 'Preencher', title: 'Ocupa o espaço disponível' },
            { value: 'pct', label: '%', title: 'Porcentagem do container' },
          ]}
        />
      </Field>
      {typeof l.width === 'number' && (
        <Field label="Largura (%)">
          <NumberInput value={l.width} min={5} max={100} suffix="%" onChange={(v) => setLayout(node.id, 'width', v)} />
        </Field>
      )}
      {(needsHeight || !isWidget) && (
        <Field label="Altura fixa (vazio = automática)">
          <NumberInput value={l.height} min={10} max={2000} suffix="px" onChange={(v) => setLayout(node.id, 'height', v || undefined)} />
        </Field>
      )}
      <Field label="Alinhamento próprio">
        <Select
          value={l.alignSelf ?? 'auto'}
          options={[
            { value: 'auto', label: 'Seguir o container' },
            { value: 'flex-start', label: 'Início' },
            { value: 'center', label: 'Centro' },
            { value: 'flex-end', label: 'Fim' },
            { value: 'stretch', label: 'Esticar' },
          ]}
          onChange={(v) => setLayout(node.id, 'alignSelf', v === 'auto' ? undefined : v)}
        />
      </Field>
      <Toggle label={`Ocultar no ${DEVICE_LABEL[device].toLowerCase()}`} checked={!!l.hidden} onChange={(v) => setLayout(node.id, 'hidden', v || (device === 'desktop' ? undefined : false))} />
    </Group>
  );
}

const JUSTIFY = [
  { value: 'flex-start' as const, label: 'Início' },
  { value: 'center' as const, label: 'Centro' },
  { value: 'flex-end' as const, label: 'Fim' },
  { value: 'space-between' as const, label: 'Espaço entre' },
  { value: 'space-around' as const, label: 'Espaço ao redor' },
  { value: 'space-evenly' as const, label: 'Espaço igual' },
];
const ALIGN = [
  { value: 'stretch' as const, label: 'Esticar' },
  { value: 'flex-start' as const, label: 'Início' },
  { value: 'center' as const, label: 'Centro' },
  { value: 'flex-end' as const, label: 'Fim' },
];

/** Controles de layout do container (também usados pelo container raiz da seção). */
export function ContainerControls({ node, device, root }: { node: ContainerNode; device: DeviceMode; root?: boolean }) {
  const p = effProps(node, device);
  const set = <K extends keyof ContainerProps>(key: K, v: ContainerProps[K] | undefined) => setNodeValue(node.id, 'props', key, v);
  return (
    <Group title="Layout dos itens">
      <Field label="Tipo">
        <Segmented
          value={p.display}
          onChange={(v) => set('display', v)}
          options={[
            { value: 'flex', label: 'Flexível' },
            { value: 'grid', label: 'Grade' },
          ]}
        />
      </Field>
      {p.display === 'flex' ? (
        <>
          <Field label="Direção">
            <Segmented
              value={p.direction}
              onChange={(v) => set('direction', v)}
              options={[
                { value: 'column', label: '↓ Coluna' },
                { value: 'row', label: '→ Linha' },
              ]}
            />
          </Field>
          <Row>
            <Field label={p.direction === 'row' ? 'Distribuir (horizontal)' : 'Distribuir (vertical)'}>
              <Select value={p.justify} options={JUSTIFY} onChange={(v) => set('justify', v)} />
            </Field>
            <Field label={p.direction === 'row' ? 'Alinhar (vertical)' : 'Alinhar (horizontal)'}>
              <Select value={p.align} options={ALIGN} onChange={(v) => set('align', v)} />
            </Field>
          </Row>
          {p.direction === 'row' && <Toggle label="Quebrar em várias linhas" checked={p.wrap} onChange={(v) => set('wrap', v)} />}
        </>
      ) : (
        <Row>
          <Field label="Colunas">
            <NumberInput value={p.columns} min={1} max={12} onChange={(v) => set('columns', Math.round(v))} />
          </Field>
          <Field label="Alinhar">
            <Select value={p.align} options={ALIGN} onChange={(v) => set('align', v)} />
          </Field>
        </Row>
      )}
      <Field label="Espaço entre itens">
        <NumberInput value={p.gap} min={0} max={200} suffix="px" onChange={(v) => set('gap', v)} />
      </Field>
      <Row>
        <Field label="Espaço interno vertical">
          <NumberInput value={p.paddingY} min={0} max={400} suffix="px" onChange={(v) => set('paddingY', v)} />
        </Field>
        <Field label="Espaço interno lateral">
          <NumberInput value={p.paddingX} min={0} max={400} suffix="px" onChange={(v) => set('paddingX', v)} />
        </Field>
      </Row>
      <Field label="Altura mínima">
        <NumberInput value={p.minHeight} min={0} max={2000} suffix="px" onChange={(v) => set('minHeight', v || undefined)} />
      </Field>
      {root && (
        <Field label="Largura máxima do conteúdo (0 = tela toda)">
          <NumberInput value={p.maxWidth ?? 0} min={0} max={2400} suffix="px" onChange={(v) => set('maxWidth', v || undefined)} />
        </Field>
      )}
    </Group>
  );
}

function useNodeStyle(node: FlowNode, device: DeviceMode) {
  return {
    style: effStyle(node, device),
    setStyle: <K extends keyof ElementStyle>(key: K, value: ElementStyle[K]) => setNodeStyle(node.id, key, value),
  };
}

function NodeActions({ node }: { node: FlowNode }) {
  return (
    <div className="btn-row insp-actions">
      <button className="btn btn-sm" onClick={() => duplicateNode(node.id)}>
        Duplicar
      </button>
      <button className="btn btn-sm" onClick={() => wrapInContainer(node.id)}>
        Agrupar
      </button>
      <button className="btn btn-sm btn-danger" onClick={() => deleteNode(node.id)}>
        Excluir
      </button>
    </div>
  );
}

export function WidgetInspector({ node, site }: { node: WidgetNode; site: Site }) {
  const device = useEditor((s) => s.device);
  const def = ELEMENTS[node.type];
  const { style, setStyle } = useNodeStyle(node, device);
  const common = { type: node.type, style, setStyle, site };
  return (
    <>
      <InspectorHeader title={labelOf(node)} badge={device !== 'desktop' ? DEVICE_LABEL[device] : undefined} />
      <DeviceNote node={node} device={device} />
      <ContentGroup
        type={node.type}
        props={node.props}
        link={node.link}
        site={site}
        setProp={(key, v) => updateNode(node.id, (n) => void ((n as WidgetNode).props[key] = v), `p.${key}`)}
        setLink={(l) => updateNode(node.id, (n) => void (l ? ((n as WidgetNode).link = l) : delete (n as WidgetNode).link), 'link')}
      />
      {def.typography && <TypographyGroup {...common} />}
      {node.type === 'line' && <LineGroup {...common} />}
      {def.box && <BoxGroup {...common} />}
      <ItemLayoutGroup node={node} device={device} isWidget />
      <Group title="Avançado" defaultOpen={false}>
        <Field label="Nome no navegador">
          <TextInput value={node.name} placeholder={def.label} onChange={(v) => renameNode(node.id, v)} />
        </Field>
      </Group>
      <NodeActions node={node} />
    </>
  );
}

const TAGS: { value: ContainerTag; label: string }[] = [
  { value: 'div', label: 'div (genérico)' },
  { value: 'section', label: 'section (seção de conteúdo)' },
  { value: 'article', label: 'article (conteúdo independente)' },
  { value: 'aside', label: 'aside (conteúdo complementar)' },
  { value: 'nav', label: 'nav (navegação)' },
  { value: 'header', label: 'header (cabeçalho)' },
  { value: 'footer', label: 'footer (rodapé)' },
];

export function ContainerInspector({ node, site }: { node: ContainerNode; site: Site }) {
  const device = useEditor((s) => s.device);
  const { style, setStyle } = useNodeStyle(node, device);
  return (
    <>
      <InspectorHeader title={labelOf(node)} subtitle={`${node.children.length} ${node.children.length === 1 ? 'item' : 'itens'}`} badge={device !== 'desktop' ? DEVICE_LABEL[device] : undefined} />
      <DeviceNote node={node} device={device} />
      <ContainerControls node={node} device={device} />
      <ItemLayoutGroup node={node} device={device} isWidget={false} />
      <BoxGroup type="shape" style={style} setStyle={setStyle} site={site} title="Fundo e borda" />
      <Group title="Avançado" defaultOpen={false}>
        <Field label="Nome no navegador">
          <TextInput value={node.name} placeholder="Container" onChange={(v) => renameNode(node.id, v)} />
        </Field>
        <Field label="Tag HTML (acessibilidade e SEO)">
          <Select value={node.tag ?? 'div'} options={TAGS} onChange={(v) => updateNode(node.id, (n) => void (v === 'div' ? delete (n as ContainerNode).tag : ((n as ContainerNode).tag = v)))} />
        </Field>
        <p className="hint">Tags semânticas ajudam leitores de tela e o Google a entender a página.</p>
      </Group>
      <NodeActions node={node} />
    </>
  );
}
