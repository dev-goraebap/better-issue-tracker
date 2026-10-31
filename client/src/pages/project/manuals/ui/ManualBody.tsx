import { useEffect, useRef, useState } from 'react';
import { MarkdownView } from '@/shared/ui';
import type { Manual, ManualPageData } from '../model/manual';
import styles from './manuals.module.css';

export type ManualHeading = { id: string; title: string; level: number };
export function ManualBody({ page, manual, onHeadings, printable = false }: { page: ManualPageData; manual: Manual; onHeadings?: (headings: ManualHeading[]) => void; printable?: boolean }) {
  const box = useRef<HTMLDivElement>(null); const [copied, setCopied] = useState('');
  useEffect(() => {
    const update = () => {
      const headings = [...(box.current?.querySelectorAll<HTMLElement>('.ProseMirror h1, .ProseMirror h2, .ProseMirror h3, .ProseMirror h4') ?? [])];
      headings.forEach((heading, index) => { heading.id = `${page.id}-heading-${index}`; });
      onHeadings?.(headings.map(heading => ({ id: heading.id, title: heading.textContent ?? '', level: Number(heading.tagName.slice(1)) })));
    };
    update(); const observer = new MutationObserver(update);
    if (box.current) observer.observe(box.current, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [page.id, page.body, onHeadings]);
  return <div className={styles.prose} ref={box} data-printable={printable || undefined}>
    <MarkdownView value={page.body} empty="아직 작성된 내용이 없습니다." attachmentUrl={id => manual.assets[id] ?? ''} />
    {!printable && <div className={styles.codeTools}>{page.body.includes('```') && <button type="button" onClick={async () => {
      const code = [...(box.current?.querySelectorAll('pre code') ?? [])].map(item => item.textContent ?? '').join('\n\n');
      try { await navigator.clipboard.writeText(code); setCopied('코드를 복사했습니다.'); } catch { setCopied('복사 권한을 확인해 주세요.'); }
    }}>코드 복사</button>}<span role="status">{copied}</span></div>}
  </div>;
}
