/** The side of the square the server keeps, in pixels (the server's Picture.SIDE). */
export const PICTURE_SIDE = 512;
const QUALITY = 0.9;

export type CropArea = { x: number; y: number; width: number; height: number };

/**
 * Cuts the chosen area of a photo into a PICTURE_SIDE square JPEG, as hohohr's avatar does. Transparent parts turn
 * white, since JPEG has none; an avatar is round and a logo's corners are rounded, so they hardly show.
 */
export async function cropPicture(source: string, area: CropArea): Promise<Blob> {
  const image = new Image();
  image.src = source;
  await image.decode();
  const canvas = document.createElement('canvas');
  canvas.width = PICTURE_SIDE;
  canvas.height = PICTURE_SIDE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('사진을 자르지 못했습니다.');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, PICTURE_SIDE, PICTURE_SIDE);
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, area.x, area.y, area.width, area.height, 0, 0, PICTURE_SIDE, PICTURE_SIDE);
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('사진을 자르지 못했습니다.')), 'image/jpeg', QUALITY));
}
