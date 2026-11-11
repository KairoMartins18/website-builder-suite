import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { Site } from '../types';
import { SiteRenderer } from '../render/SiteRenderer';
import { collectFonts } from '../lib/theme';
import { useFonts } from '../lib/fontLoader';

const RENDER_WIDTH = 1280;

/** Miniatura da página inicial (renderização real, reduzida para a largura do contêiner). */
export const SiteThumbnail = memo(function SiteThumbnail({ site }: { site: Site }) {
  useFonts(collectFonts(site));
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const page = site.pages.find((p) => p.id === site.homePageId) ?? site.pages[0];
  const env = useMemo(() => ({ site, pageId: page.id, mode: 'thumb' as const, hrefForPage: () => '#' }), [site, page.id]);

  useLayoutEffect(() => {
    const node = ref.current!;
    const ro = new ResizeObserver(() => setWidth(node.clientWidth));
    ro.observe(node);
    setWidth(node.clientWidth);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={ref} className="thumb" aria-hidden>
      {width > 0 && (
        <div className="thumb-inner" style={{ width: RENDER_WIDTH, transform: `scale(${width / RENDER_WIDTH})` }}>
          <SiteRenderer site={site} page={page} target="desktop" env={env} scheme="light" />
        </div>
      )}
    </div>
  );
});
