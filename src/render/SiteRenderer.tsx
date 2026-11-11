import type { CSSProperties } from 'react';
import { DESKTOP_WIDTH, MOBILE_WIDTH, TABLET_WIDTH, type ContainerNode, type DeviceMode, type FlowNode, type Page, type Section, type Site } from '../types';
import { mobileLayout, pageSections, sectionHeight } from '../lib/layout';
import { flowCss, isFlow } from '../lib/flow';
import { darkSchemeCss, darkSectionsCss, resolveColor, themeVars } from '../lib/theme';
import { RenderedElement, RenderedWidget, type RenderEnv } from './ElementContent';

export type RenderTarget = DeviceMode | 'responsive';

/** Escala das seções em modo livre no tablet (o layout de computador é reduzido). */
export const TABLET_FREE_ZOOM = TABLET_WIDTH / DESKTOP_WIDTH;

function freeSectionRules(s: Section, device: DeviceMode): string {
  if (device === 'mobile' && s.mobileHidden) return `.s-${s.id}{display:none}`;
  if (isFlow(s)) return '';
  const geomDevice = device === 'mobile' ? 'mobile' : 'desktop';
  let css = `.s-${s.id}{height:${sectionHeight(s, geomDevice)}px}`;
  const ml = geomDevice === 'mobile' ? mobileLayout(s) : null;
  for (const el of s.elements) {
    if (ml && el.mobileHidden) {
      css += `.e-${el.id}{display:none}`;
      continue;
    }
    const g = ml ? ml.geoms[el.id] ?? el : el;
    css += `.e-${el.id}{left:${g.x}px;top:${g.y}px;width:${g.w}px;height:${g.h}px}`;
  }
  return css;
}

/** CSS de posicionamento das seções livres + CSS das seções em fluxo. */
export function layoutCss(sections: Section[], target: RenderTarget): string {
  const desktop = sections.map((s) => freeSectionRules(s, 'desktop')).join('\n');
  const mobileFree = (scope: string) => `${scope}{width:${MOBILE_WIDTH}px}\n` + sections.map((s) => freeSectionRules(s, 'mobile')).join('\n');
  switch (target) {
    case 'desktop':
      return desktop + '\n' + flowCss(sections, 'desktop');
    case 'tablet':
      return `${desktop}\n.wb-tablet .wb-free{zoom:${TABLET_FREE_ZOOM}}\n${flowCss(sections, 'tablet')}`;
    case 'mobile':
      return mobileFree('.wb-mobile .wb-free .wb-inner') + '\n' + flowCss(sections, 'mobile');
    case 'responsive':
      return `${desktop}\n${flowCss(sections, 'responsive')}\n@media (max-width:767px){\n${mobileFree('.wb-free .wb-inner')}\n}`;
  }
}

export function sectionBackground(s: Section): CSSProperties {
  const bg = s.background;
  const css: CSSProperties = {};
  if (bg.color) css.backgroundColor = resolveColor(bg.color);
  const layers = [bg.image && `url("${bg.image}")`, bg.gradient].filter(Boolean);
  if (layers.length) css.backgroundImage = layers.join(', ');
  if (bg.image) {
    css.backgroundSize = bg.size ?? 'cover';
    css.backgroundPosition = bg.position ?? 'center';
    css.backgroundRepeat = bg.size === 'auto' ? 'repeat' : 'no-repeat';
    if (bg.fixed) css.backgroundAttachment = 'fixed';
  }
  return css;
}

export function FlowNodeView({ node, env }: { node: FlowNode; env: RenderEnv }) {
  if (node.kind === 'widget') return <RenderedWidget node={node} env={env} />;
  const Tag = (node as ContainerNode).tag ?? 'div';
  return (
    <Tag className={`wb-c n-${node.id}`}>
      {node.children.map((c) => (
        <FlowNodeView key={c.id} node={c} env={env} />
      ))}
    </Tag>
  );
}

export function RenderedSection({ section, env }: { section: Section; env: RenderEnv }) {
  const Tag = section.kind === 'header' ? 'header' : section.kind === 'footer' ? 'footer' : 'section';
  const flow = isFlow(section);
  const cls = `wb-section ${flow ? 'wb-flow' : 'wb-free'} s-${section.id}${section.kind === 'header' && section.sticky ? ' wb-sticky' : ''}`;
  return (
    <Tag className={cls} style={sectionBackground(section)} id={section.kind === 'body' ? section.id : undefined} aria-label={section.kind === 'body' ? section.name : undefined}>
      {section.background.overlay && <div className="wb-overlay" style={{ background: resolveColor(section.background.overlay) }} />}
      {flow ? (
        <FlowNodeView node={section.root!} env={env} />
      ) : (
        <div className="wb-inner">
          {section.elements.map((el) => (
            <RenderedElement key={el.id} el={el} env={env} />
          ))}
        </div>
      )}
    </Tag>
  );
}

export function SiteRenderer({ site, page, target, env, scheme }: { site: Site; page: Page; target: RenderTarget; env: RenderEnv; scheme?: 'light' | 'dark' }) {
  const sections = pageSections(site, page);
  const [header, ...rest] = sections;
  const footer = rest.pop()!;
  const deviceClass = target === 'mobile' ? ' wb-mobile' : target === 'tablet' ? ' wb-tablet' : '';
  return (
    <div className={`wb-site${deviceClass}`} style={themeVars(site.theme)} data-wb-scheme={scheme}>
      <style dangerouslySetInnerHTML={{ __html: layoutCss(sections, target) + '\n' + darkSchemeCss(site) + '\n' + darkSectionsCss(site, sections) }} />
      {env.mode === 'export' && (
        <a className="wb-skip" href="#wb-main">
          Pular para o conteúdo
        </a>
      )}
      <RenderedSection section={header} env={env} />
      <main id="wb-main" tabIndex={-1}>
        {rest.map((s) => (
          <RenderedSection key={s.id} section={s} env={env} />
        ))}
      </main>
      <RenderedSection section={footer} env={env} />
    </div>
  );
}
