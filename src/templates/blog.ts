// Páginas especiais de blog: listagem de posts e modelo de post (com containers).
import type { Section, WidgetNode } from '../types';
import { uid } from '../lib/id';
import { box, eyebrow, flowSection, heading, row, col } from './kit';

const w = (type: WidgetNode['type'], props: WidgetNode['props'], style: WidgetNode['style'] = {}, layout: WidgetNode['layout'] = {}): WidgetNode => ({
  id: uid('n'),
  kind: 'widget',
  type,
  props,
  style: { fontFamily: 'theme:body', color: 'theme:text', ...style },
  layout,
});

const sidebar = () =>
  col(
    [
      w('search', { placeholder: 'Buscar no blog…', buttonText: 'Buscar' }, { fontSize: 15 }),
      w('categories', { title: 'Categorias', showCount: true, dropdown: false }, { fontSize: 15 }),
      w('tagCloud', { title: 'Tags' }, { fontSize: 14 }),
      w('archives', { title: 'Arquivos', showCount: false, dropdown: true }, { fontSize: 15 }),
    ],
    { gap: 32 },
    { layout: { width: 28 }, responsive: { mobile: { layout: { width: 'fill' } } } },
  );

/** Página de blog: título, lista de posts (os da página atual) e barra lateral. */
export function blogPageSections(): Section[] {
  return [
    flowSection(
      'Blog',
      [
        box({ gap: 10 }, [eyebrow('Blog'), heading('Artigos e novidades', 46, {}, 1)]),
        row(
          [
            col([
              w(
                'postFeed',
                { layout: 'grid', columns: 2, perPage: 6, source: 'inherit', showImage: true, showCategory: true, showDate: true, showAuthor: true, showExcerpt: true, readMore: 'Leia mais', pagination: true },
                { fontSize: 15 },
                { width: 'fill' },
              ),
            ]),
            sidebar(),
          ],
          { align: 'flex-start', gap: 48 },
        ),
      ],
      {},
      { paddingY: 80 },
    ),
  ];
}

/** Modelo de post: imagem destacada, título, informações, conteúdo, tags, autor, navegação e comentários. */
export function postTemplateSections(): Section[] {
  return [
    flowSection(
      'Post',
      [
        w('postMeta', { showDate: true, showAuthor: true, showCategory: true }, { fontSize: 14, opacity: 0.8 }),
        w('postTitle', { level: 1 }, { fontFamily: 'theme:heading', fontSize: 46, fontWeight: 700, lineHeight: 1.15 }),
        w('postFeaturedImage', {}, { borderRadius: 14 }, { height: 420 }),
        w('postContent', {}, { fontSize: 18, lineHeight: 1.8 }),
        w('postTags', {}, { fontSize: 14 }),
        w('postAuthor', { showBio: true }, { fontSize: 15, background: 'theme:muted', borderRadius: 14, padding: 22 }),
        w('postNavigation', {}, { color: 'theme:primary', fontSize: 15, fontWeight: 600 }),
        w('comments', { title: 'Comentários', showForm: true }, { fontSize: 15 }),
      ],
      {},
      { paddingY: 72, maxWidth: 760, gap: 28 },
    ),
  ];
}
