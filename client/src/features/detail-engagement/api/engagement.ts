import { queryOptions } from '@tanstack/react-query';
import { ApiError, command, readJson, type components } from '@/shared/api';

export type DetailTarget = { workspaceId: string; type: 'work_item' | 'document' | 'comment'; id: string };
export type PendingFile = { id: string; filename: string; size: number; image: boolean; preview?: string };
export const engagementBase = ({ workspaceId, type, id }: DetailTarget) => `/api/v1/workspaces/${encodeURIComponent(workspaceId)}/engagement/${type}/${encodeURIComponent(id)}`;
export const reactionsQuery = (target: DetailTarget) => queryOptions({ queryKey: ['workspace', target.workspaceId, 'reactions', target.type, target.id], queryFn: ({ signal }) => readJson<components['schemas']['ReactionView'][]>(`${engagementBase(target)}/reactions`, signal), retry: false });
export const attachedFilesQuery = (target: DetailTarget) => queryOptions({ queryKey: ['workspace', target.workspaceId, 'files', target.type, target.id], queryFn: ({ signal }) => readJson<components['schemas']['AttachedFile'][]>(`${engagementBase(target)}/files`, signal), retry: false });
export const react = (target: DetailTarget, emoji: string, active: boolean) => command('PUT', `${engagementBase(target)}/reactions`, { emoji, active });
export const attachFiles = (target: DetailTarget, uploadIds: string[]) => command('POST', `${engagementBase(target)}/files`, { uploadIds });
export const removeFile = (target: DetailTarget, fileId: string) => command('DELETE', `${engagementBase(target)}/files/${encodeURIComponent(fileId)}`);
export const fileHref = (target: DetailTarget, fileId: string, download = true) => `${engagementBase(target)}/files/${encodeURIComponent(fileId)}/open?download=${download}`;
export const bytesText = (size: number) => size < 1024 ? `${size} B` : size < 1024 ** 2 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 ** 2).toFixed(1)} MB`;
export async function uploadFile(file: File): Promise<PendingFile> {
  const ticket = await command<components['schemas']['UploadTicket']>('POST', '/api/v1/files/uploads', { filename: file.name, size: file.size });
  const sent = await fetch(ticket.url, { method: ticket.method, headers: ticket.headers, body: file });
  if (!sent.ok) throw new ApiError(sent.status, 'FILE_NOT_STORED', undefined, '파일을 올리지 못했습니다. 다시 시도해 주세요.');
  const image = /\.(png|jpe?g|webp|gif)$/i.test(file.name);
  return { id: ticket.id, filename: file.name, size: file.size, image, ...(image ? { preview: URL.createObjectURL(file) } : {}) };
}
