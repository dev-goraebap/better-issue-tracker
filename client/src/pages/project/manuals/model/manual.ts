export type Cover = 'book' | 'structure' | 'path';
export type ManualPageData = { id: string; title: string; body: string; sectionId: string; updatedAt: string };
export type ManualComment = { id: string; pageId: string; body: string; resolved: boolean; createdAt: string };
export type Manual = { id: string; title: string; description: string; cover: Cover; image?: string; icon?: string; color?: string; createdAt?: string; updatedAt?: string;
  sections: { id: string; title: string }[]; pages: ManualPageData[]; comments: ManualComment[]; assets: Record<string, string> };
export type ManualSearch = { manual?: string; page?: string; q?: string; scope?: string; color?: string; sort?: 'title' | 'updated'; dir?: 'asc' | 'desc'; finding?: 1 };
export const parseManualSearch = (input: Record<string, unknown>): ManualSearch => ({
  ...(typeof input.manual === 'string' ? { manual: input.manual } : {}),
  ...(typeof input.page === 'string' ? { page: input.page } : {}),
  ...(typeof input.q === 'string' && input.q.trim() ? { q: input.q.slice(0, 200) } : {}),
  ...(typeof input.scope === 'string' && /^(workspace|[A-Za-z][A-Za-z0-9]{9})$/.test(input.scope) ? { scope: input.scope } : {}),
  ...(typeof input.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(input.color) ? { color: input.color } : {}),
  ...(input.sort === 'title' || input.sort === 'updated' ? { sort: input.sort } : {}),
  ...(input.dir === 'asc' || input.dir === 'desc' ? { dir: input.dir } : {}),
  ...(input.finding === 1 || input.finding === '1' ? { finding: 1 as const } : {}),
});
export const newId = () => `m${crypto.randomUUID().replaceAll('-', '').slice(0, 9)}`;
export const now = () => new Date().toISOString();
/** Legacy cover data is preserved when the library presents older manuals as marks. */
export const manualMark = (manual?: Manual) => ({ icon: manual?.icon ?? (manual?.cover === 'structure' ? 'workflow' : manual?.cover === 'path' ? 'milestone' : 's:notebook-2'),
  color: manual?.color ?? (manual?.cover === 'structure' ? '#20b2a0' : manual?.cover === 'path' ? '#c2a477' : '#bb87fc') });
export const pagesInOrder = (manual: Manual) => ['', ...manual.sections.map(section => section.id)]
  .flatMap(sectionId => manual.pages.filter(page => page.sectionId === sectionId));
export function movePage(manual: Manual, id: string, direction: -1 | 1): Manual {
  const page = manual.pages.find(item => item.id === id);
  if (!page) return manual;
  const siblings = manual.pages.filter(item => item.sectionId === page.sectionId);
  const at = siblings.findIndex(item => item.id === id); const other = siblings[at + direction];
  if (!other) return manual;
  return { ...manual, pages: manual.pages.map(item => item.id === id ? other : item.id === other.id ? page : item) };
}
export const findPages = (manual: Manual, query: string) => pagesInOrder(manual).filter(page =>
  `${page.title}\n${page.body}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
export const pageMarkdown = (page: ManualPageData) => `# ${page.title}\n\n${page.body}\n`;
export const safeFilename = (name: string) => (name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || 'manual').slice(0, 100);
export const isManuals = (value: unknown): value is Manual[] => Array.isArray(value) && value.every(manual =>
  manual && typeof manual.id === 'string' && typeof manual.title === 'string' && typeof manual.description === 'string' &&
  ['book', 'structure', 'path'].includes(manual.cover) &&
  [manual.createdAt, manual.updatedAt].every(time => time === undefined || typeof time === 'string' && (!time || Number.isFinite(Date.parse(time)))) && (manual.icon === undefined || typeof manual.icon === 'string' && manual.icon.length > 0 && manual.icon.length <= 120) &&
  (manual.color === undefined || typeof manual.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(manual.color)) && Array.isArray(manual.sections) &&
  manual.sections.every((s: { id?: unknown; title?: unknown }) => typeof s?.id === 'string' && typeof s.title === 'string') &&
  Array.isArray(manual.pages) && manual.pages.every((p: ManualPageData) => typeof p?.id === 'string' && typeof p.title === 'string' && typeof p.body === 'string' &&
    typeof p.updatedAt === 'string' && typeof p.sectionId === 'string' && (p.sectionId === '' || manual.sections.some((s: { id: string }) => s.id === p.sectionId))) &&
  Array.isArray(manual.comments) && manual.comments.every((c: ManualComment) => typeof c?.id === 'string' && typeof c.body === 'string' && typeof c.pageId === 'string' && typeof c.resolved === 'boolean') &&
  manual.assets && typeof manual.assets === 'object' && Object.values(manual.assets).every(url => typeof url === 'string'));
