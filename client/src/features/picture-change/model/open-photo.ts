const extensionOf = (name: string) => (name.includes('.') ? name.slice(name.lastIndexOf('.') + 1).toLowerCase() : '');
const HEIC = /^image\/hei[cf](-sequence)?$/;

/**
 * Why a photo the browser could not draw was refused. HEIC, the format iPhones save in, opens in Safari but not in
 * Chrome, so it is named and the way out given; anything else names its format.
 */
function cannotOpenText(type: string, name: string): string {
  if (HEIC.test(type) || ['heic', 'heif'].includes(extensionOf(name)))
    return '이 브라우저는 HEIC 사진을 열 수 없습니다. 사진 앱에서 JPEG로 내보낸 사진을 고르거나 Safari에서 다시 시도해 주세요.';
  return `이 브라우저가 이 사진을 열지 못했습니다(형식: ${type || `알 수 없음(.${extensionOf(name)})`}). JPG나 PNG 사진으로 골라 주세요.`;
}

/**
 * Opens a chosen photo the way the cropper will, before the cropper shows it (hohohr's open-photo): a file the browser
 * cannot draw is refused at once with its format named, instead of leaving an empty frame and failing on save. The
 * address it answers holds the file in memory until it is revoked.
 */
export async function openPhoto(file: File): Promise<{ url: string } | { problem: string }> {
  if (file.type && !file.type.startsWith('image/')) return { problem: '사진 파일을 골라 주세요.' };
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    return { url };
  } catch {
    URL.revokeObjectURL(url);
    return { problem: cannotOpenText(file.type, file.name) };
  }
}
