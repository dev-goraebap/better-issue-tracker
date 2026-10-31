import { pagesInOrder, type Manual } from './manual';

export const manualPageRows = (manual: Manual) => ['', ...manual.sections.map(section => section.id)].flatMap(sectionId => [
  ...(sectionId ? [{ id: `section-${sectionId}`, name: manual.sections.find(section => section.id === sectionId)!.title }] : []),
  ...pagesInOrder(manual).filter(page => page.sectionId === sectionId).map(page => ({ id: `page-${page.id}`, name: page.title })),
]);

/** Fixed section markers let a page enter even an empty section; content, assets and comments stay intact. */
export function orderManualPages(manual: Manual, order: readonly string[]): Manual {
  let sectionId = '';
  const seen = new Set<string>();
  const pages: Manual['pages'] = [];
  for (const token of order) {
    if (token.startsWith('section-')) {
      const id = token.slice(8);
      if (manual.sections.some(section => section.id === id)) sectionId = id;
    } else if (token.startsWith('page-')) {
      const page = manual.pages.find(page => page.id === token.slice(5));
      if (page && !seen.has(page.id)) { seen.add(page.id); pages.push({ ...page, sectionId }); }
    }
  }
  return { ...manual, pages: [...pages, ...manual.pages.filter(page => !seen.has(page.id))] };
}
