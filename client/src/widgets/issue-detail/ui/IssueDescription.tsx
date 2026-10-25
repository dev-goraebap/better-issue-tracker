import { useEffect, useRef, useState } from 'react';
import { MarkdownEditor, MarkdownView } from '@/shared/ui';
import styles from './detail.module.css';

/** How long typing rests before the description is saved. */
const REST_MS = 800;

/**
 * An issue's description, as Linear's: written in place, no 편집 to press (D-076). A member writes in the editor and it
 * saves itself once typing rests, when the editor is left and when the issue is closed; a quiet word beside the head
 * says 저장 중 and then 저장됨. A viewer reads it rendered.
 */
export function IssueDescription({ value, canWrite, onSave }: { value: string; canWrite: boolean; onSave: (markdown: string | null) => Promise<boolean> }) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const pending = useRef<string | null>(null);
  const timer = useRef(0);
  const saveRef = useRef(onSave);
  useEffect(() => { saveRef.current = onSave; });
  const flush = () => {
    window.clearTimeout(timer.current);
    const markdown = pending.current;
    if (markdown === null) return;
    pending.current = null;
    setState('saving');
    void saveRef.current(markdown.trim() ? markdown : null).then(isSaved => setState(isSaved ? 'saved' : 'idle'));
  };
  // Leaving the issue saves what was still waiting.
  useEffect(() => () => {
    window.clearTimeout(timer.current);
    if (pending.current !== null) void saveRef.current(pending.current.trim() ? pending.current : null);
  }, []);
  if (!canWrite) return <MarkdownView value={value} empty="설명이 없습니다." />;
  return <div className={styles.description}>
    <span className={styles.saveState} role="status" aria-live="polite">{state === 'saving' ? '저장 중…' : state === 'saved' ? '저장됨' : ''}</span>
    <MarkdownEditor value={value} label="설명" placeholder="설명을 덧붙이세요… ( / 로 블록, 마크다운 그대로 써도 됩니다)" minHeight="6rem"
      onChange={markdown => { pending.current = markdown; setState('idle'); window.clearTimeout(timer.current); timer.current = window.setTimeout(flush, REST_MS); }}
      onBlur={flush} />
  </div>;
}
