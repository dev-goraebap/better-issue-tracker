import { pageMarkdown, safeFilename, type ManualPageData } from './manual';
import { zipFiles } from './zip';
export async function downloadPage(page: ManualPageData, assets: Record<string, string>) {
  let markdown = pageMarkdown(page); const ids = [...new Set([...markdown.matchAll(/\(attachment:([A-Za-z][A-Za-z0-9]{9})\)/g)].map(match => match[1]!))];
  const files: { name: string; bytes: Uint8Array }[] = [];
  for (const id of ids) {
    const source = assets[id]; if (!source) throw new Error('이미지를 찾을 수 없어 내보내지 못했습니다.');
    const response = await fetch(source); if (!response.ok) throw new Error('이미지 원본을 읽지 못했습니다.');
    const mime = response.headers.get('Content-Type') ?? ''; const extension = mime.includes('svg') ? 'svg' : mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
    const name = `images/${id}.${extension}`; files.push({ name, bytes: new Uint8Array(await response.arrayBuffer()) }); markdown = markdown.replaceAll(`(attachment:${id})`, `(${name})`);
  }
  const filename = `${safeFilename(page.title)}.md`;
  const blob = files.length ? new Blob([zipFiles([{ name: filename, bytes: new TextEncoder().encode(markdown) }, ...files]).buffer as ArrayBuffer], { type: 'application/zip' }) : new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = `${safeFilename(page.title)}.${files.length ? 'zip' : 'md'}`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
/** A real browser print document, without navigation, comments or controls. Keeps source font/style assets. */
export async function printManual(content: HTMLElement, title: string) {
  const target = window.open('', '_blank');
  if (!target) throw new Error('인쇄 창을 열 수 없습니다. 팝업 허용 설정을 확인해 주세요.');
  target.opener = null;
  target.document.open(); target.document.write('<!doctype html><html lang="ko"><head><meta charset="utf-8"></head><body></body></html>'); target.document.close();
  target.document.title = title;
  const base = target.document.createElement('base'); base.href = window.location.href; target.document.head.append(base);
  document.head.querySelectorAll('style,link[rel="stylesheet"]').forEach(style => target.document.head.append(style.cloneNode(true)));
  const copied = content.cloneNode(true) as HTMLElement; copied.removeAttribute('hidden'); target.document.body.append(copied);
  const style = target.document.createElement('style');
  style.textContent = `@page{size:A4;margin:18mm 16mm}:root{--color-text-primary:#242428;--color-text-secondary:#61616e;--color-background-surface:#fff;--color-background-muted:#f5f5f7;--color-border:#ddd}html,body{color:#242428!important;background:white!important;height:auto!important;overflow:visible!important}body>div{display:block!important}article{max-width:720px;margin:30px auto;break-before:page}article:first-child{break-before:auto}h1{font-size:28px;line-height:1.35;margin:0 0 32px}h2,h3{break-after:avoid}pre,table,figure,img{break-inside:avoid}img{max-width:100%;max-height:220mm;object-fit:contain}.ProseMirror{color:#242428!important}button{display:none!important}button:has(img){display:block!important;background:transparent!important;border:0!important;padding:0!important}a{color:inherit!important}p,li{orphans:3;widows:3}pre{white-space:pre-wrap!important;overflow-wrap:anywhere}*{box-shadow:none!important}`;
  target.document.head.append(style);
  await Promise.race([Promise.all([target.document.fonts.ready, ...Array.from(target.document.images, image => image.decode().catch(() => {}))]), new Promise(resolve => setTimeout(resolve, 5000))]);
  target.focus(); target.print();
}
