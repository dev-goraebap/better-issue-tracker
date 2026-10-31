import { isManuals, newId, type Manual } from './manual';

const identity = /^[A-Za-z][A-Za-z0-9_-]{0,79}$/;
const unique = (ids: string[]) => new Set(ids).size === ids.length;
/** Portable authoring bundle: original Markdown + embedded images, without accounts or server permissions. */
export function readManualPackage(text: string): Manual {
  const value: unknown = JSON.parse(text);
  if (!value || typeof value !== 'object' || !('format' in value) || value.format !== 'bit-manual' || !('version' in value) || value.version !== 1 || !('manual' in value) || !isManuals([value.manual])) throw new Error('BIT 매뉴얼 파일 형식이 아닙니다.');
  const manual = value.manual as Manual;
  if (!identity.test(manual.id) || !manual.title.trim() || manual.title.length > 120 || manual.description.length > 400 || manual.sections.length > 50 || manual.pages.length > 200 || Object.keys(manual.assets).length > 100) throw new Error('매뉴얼의 이름이나 구성 범위를 확인해 주세요.');
  if (!unique(manual.sections.map(section => section.id)) || !unique(manual.pages.map(page => page.id)) ||
    manual.sections.some(section => !identity.test(section.id) || !section.title.trim() || section.title.length > 100) ||
    manual.pages.some(page => !identity.test(page.id) || !page.title.trim() || page.title.length > 160 || page.body.length > 200_000)) throw new Error('페이지와 섹션의 이름 또는 식별자가 올바르지 않습니다.');
  for (const [id, source] of Object.entries(manual.assets)) {
    if (!/^[A-Za-z][A-Za-z0-9]{9}$/.test(id) || !/^data:image\/(png|jpeg|webp|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(source)) throw new Error('이미지는 매뉴얼 파일 안에 포함되어 있어야 합니다.');
  }
  if (manual.image && !/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(manual.image)) throw new Error('표지 이미지 형식을 확인해 주세요.');
  for (const page of manual.pages) for (const reference of page.body.matchAll(/attachment:([A-Za-z][A-Za-z0-9]{9})/g)) {
    if (!manual.assets[reference[1]!]) throw new Error(`‘${page.title}’의 이미지가 빠져 있습니다.`);
  }
  return manual;
}
export const manualAsNew = (manual: Manual): Manual => ({ ...manual, id: newId(), comments: [], version: undefined, canEdit: undefined, pageCount: undefined, projectId: undefined });
