import { drawnAvatarSource } from '@/shared/lib/drawn-avatars';

/** Uses the existing bundled drawings and the same validated picture upload as a chosen photograph. */
export async function presetPicture(number: number): Promise<Blob> {
  const image = new Image();
  image.src = drawnAvatarSource(number);
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = 256; canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('사진을 만들지 못했습니다. 다시 시도해 주세요.');
  context.drawImage(image, 0, 0, 256, 256);
  return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('사진을 만들지 못했습니다.')), 'image/jpeg', 0.92));
}
