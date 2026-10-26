import { ApiError, command, type components } from '@/shared/api';
import { measureImage } from '@/shared/lib/image-traits';

type UploadTicket = components['schemas']['UploadTicket'];

/**
 * Sends a picture already cut to the square the server keeps straight to storage, as every upload goes (D-090): the
 * server hands out where to send it, with the colour and size the browser measured, and the answer is the upload's id
 * for the owner's change (내 사진, 워크스페이스 로고) to take.
 */
export async function uploadPicture(picture: Blob, filename: string): Promise<string> {
  const traits = await measureImage(picture);
  const ticket = await command<UploadTicket>('POST', '/api/v1/files/uploads', { filename, size: picture.size, purpose: 'picture', ...traits });
  const sent = await fetch(ticket.url, { method: ticket.method, headers: ticket.headers, body: picture });
  if (!sent.ok) throw new ApiError(sent.status, 'FILE_NOT_STORED', undefined, '사진을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.');
  return ticket.id;
}
