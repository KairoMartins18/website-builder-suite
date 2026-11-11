import type { Page, Section } from '../types';
import { confirmDialog } from '../components/Dialogs';
import { deletePage, deleteSection } from './actions';

export async function confirmDeleteSection(section: Section) {
  const ok =
    !section.elements.length ||
    (await confirmDialog({ title: 'Excluir seção', message: `Excluir a seção "${section.name}" e todo o seu conteúdo?`, confirmLabel: 'Excluir', danger: true }));
  if (ok) deleteSection(section.id);
}

export async function confirmDeletePage(page: Page) {
  if (await confirmDialog({ title: 'Excluir página', message: `Excluir a página "${page.name}"?`, confirmLabel: 'Excluir', danger: true })) deletePage(page.id);
}
