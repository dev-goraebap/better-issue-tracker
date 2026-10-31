import { command, readJson, type components } from '@/shared/api';
import { isManuals, manualMark, type Manual } from '../model/manual';

export type ManualSummary = components['schemas']['ManualSummary'];
export type ManualListing = components['schemas']['ManualListing'];
type ManualDetail = components['schemas']['ManualDetail'];
export const manualRoot = (workspaceId: string) => `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/manuals`;
export const readManual = async (workspaceId: string, id: string, signal?: AbortSignal): Promise<Manual> => {
  const value = await readJson<ManualDetail>(`${manualRoot(workspaceId)}/${encodeURIComponent(id)}`, signal);
  const manual = { ...value, ...value.content, cover: 'book' };
  if (!isManuals([manual])) throw new Error('매뉴얼 응답을 읽지 못했습니다.');
  return manual as Manual;
};
export async function storeManual(workspaceId: string, projectId: string | undefined, manual: Manual): Promise<void> {
  let pages = manual.pages;
  const uploads: string[] = [];
  for (const [id, source] of Object.entries(manual.assets)) {
    if (!source.startsWith('data:') || !pages.some(page => page.body.includes(`attachment:${id}`))) continue;
    const blob = await (await fetch(source)).blob();
    const ext = blob.type.includes('svg') ? 'svg' : blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : 'jpg';
    const ticket = await command<components['schemas']['UploadTicket']>('POST', '/api/v1/files/uploads', { filename: `${id}.${ext}`, size: blob.size });
    const sent = await fetch(ticket.url, { method: ticket.method, headers: ticket.headers, body: blob });
    if (!sent.ok) throw new Error('이미지 원본을 올리지 못했습니다. 초안은 유지됩니다.');
    uploads.push(ticket.id);
    pages = pages.map(page => ({ ...page, body: page.body.replaceAll(`attachment:${id}`, `attachment:${ticket.id}`) }));
  }
  const body: components['schemas']['SaveManual'] = { id: manual.id, projectId: manual.projectId ?? projectId, expectedVersion: manual.version,
    title: manual.title, description: manual.description, ...manualMark(manual),
    content: { sections: manual.sections, pages, comments: manual.comments }, uploadIds: uploads };
  await command(manual.version === undefined ? 'POST' : 'PUT', `${manualRoot(workspaceId)}${manual.version === undefined ? '' : `/${encodeURIComponent(manual.id)}`}`, body);
}
