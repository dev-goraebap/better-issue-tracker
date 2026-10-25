import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { MarkdownEditor } from '@/shared/ui';
import styles from './activity.module.css';

/**
 * Where a comment is written, at the timeline's foot as Linear's: the Markdown editor in its hairline box (a phone's
 * formatting bar over the keyboard), 댓글 under it; Ctrl (⌘) + Enter sends. A sent comment empties the box, which keeps
 * the caret for the next.
 */
export function CommentComposer({ onSend }: { onSend: (body: string) => Promise<boolean> }) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [body, setBody] = useState('');
  const [isBusy, setBusy] = useState(false);
  // A fresh editor after each comment sent: an editor keeps its text while it has the caret.
  const [sent, setSent] = useState(0);
  const send = async () => {
    if (!body.trim() || isBusy) return;
    setBusy(true);
    if (await onSend(body)) { setBody(''); setSent(count => count + 1); }
    setBusy(false);
  };
  return <div className={styles.composer}>
    <MarkdownEditor key={sent} value={body} onChange={setBody} label="댓글" variant="field" minHeight="3.5rem" autoFocus={sent > 0} isDisabled={isBusy}
      placeholder="댓글을 남기세요…" onSubmit={() => { void send(); }} />
    <div className={styles.actions}>
      <Button label="댓글" variant="primary" size="sm" onClick={() => { void send(); }} isLoading={isBusy} isDisabled={!body.trim()}
        tooltip={isMobile ? undefined : 'Ctrl + Enter'} />
    </div>
  </div>;
}
