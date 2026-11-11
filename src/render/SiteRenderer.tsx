import type { CSSProperties } from 'react';
import { MOBILE_WIDTH, type DeviceMode, type Page, type Section, type Site } from '../types';
import { mobileLayout, pageSections, sectionHeight } from '../lib/layout';
import { resolveColor, themeVars } from '../lib/theme';
import { RenderedElement, type RenderEnv } from './ElementContent';

export type RenderTarget = DeviceMode | 'responsive';

function sectionRules(s: Section, device: DeviceMode): string {
  if (device === 'mobile' && s.mobileHidden) return `.s-${s.id}{display:none}`;
  let css = `.s-${s.id}{height:${sectionHeight(s, device)}px}`;
  const ml = device === 'mobile' ? mobileLayout(s) : null;
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

/** CSS de posicionamento: desktop, mobile ou responsivo (com media query). */
export function layoutCss(sections: Section[], target: RenderTarget): string {
  const desktop = sections.map((s) => sectionRules(s, 'desktop')).join('\n');
  if (target === 'desktop') return desktop;
  const inner = target === 'mobile' ? '.wb-mobile .wb-inner' : '.wb-inner';
  const mobile = `${inner}{width:${MOBILE_WIDTH}px}\n` +sections.map((s) => sectionRules(s, 'mobile')).join('\n');
  if (target === 'mobile') return mobile;
  return `${desktop}\n@media (max-width:767px){\n${mobile}\n}`;
}

export function sectionBackground(s: Section): CSSProperties {
  const bg = s.background;
  const css: CSSProperties = {};
  if (bg.color) css.backgroundColor = resolveColor(bg.color);
  if (bg.image) {
    css.backgroundImage = `url("${bg.image}")`;
    css.backgroundSize = bg.size ?? 'cover';
    css.backgroundPosition = bg.position ?? 'center';
    css.backgroundRepeat = bg.size === 'auto' ? 'repeat' : 'no-repeat';
    if (bg.fixed) css.backgroundAttachment = 'fixed';
  }
  return css;
}

function RenderedSection({ section, env }: { section: Section; env: RenderEnv }) {
  const Tag = section.kind === 'header' ? 'header' : section.kind === 'footer' ? 'footer' : 'section';
  const cls = `wb-section s-${section.id}${section.kind === 'header' && section.sticky ? ' wb-sticky' : ''}`;
  return (
    <Tag className={cls} style={sectionBackground(section)} id={section.kind === 'body' ? section.id : undefined}>
      {section.background.overlay && <div className="wb-overlay" style={{ background: resolveColor(section.background.overlay) }} />}
      <div className="wb-inner">
        {section.elements.map((el) => (
          <RenderedElement key={el.id} el={el} env={env} />
        ))}
      </div>
    </Tag>
  );
}

export function SiteRenderer({ site, page, target, env }: { site: Site; page: Page; target: RenderTarget; env: RenderEnv }) {
  const sections = pageSections(site, page);
  const [header, ...rest] = sections;
  const footer = rest.pop()!;
  return (
    <div className={`wb-site${target === 'mobile' ? ' wb-mobile' : ''}`} style={themeVars(site.theme)}>
      <style dangerouslySetInnerHTML={{ __html: layoutCss(sections, target) }} />
      <RenderedSection section={header} env={env} />
      <main>
        {rest.map((s) => (
          <RenderedSection key={s.id} section={s} env={env} />
        ))}
      </main>
      <RenderedSection section={footer} env={env} />
    </div>
  );
}
