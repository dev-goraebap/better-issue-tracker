import { useState } from 'react';
import { ChatComposer, ChatSendButton } from '@astryxdesign/core';
import { MarkdownEditor } from '@/shared/ui';
import styles from './activity.module.css';

/**
 * Where a comment is written, at the timeline's foot: the design system's chat composer (a raised box, its corners the comment cards' 10px) holding
 * the Markdown editor (a phone's formatting bar over the keyboard), its round send button at the box's foot; Ctrl (⌘) +
 * Enter sends too. The text stays until the comment is saved, so a failed send loses nothing; a sent comment empties the
 * box, which keeps the caret for the next.
 */
export function CommentComposer({ onSend }: { onSend: (body: string) => Promise<boolean> }) {
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
  return <ChatComposer className={styles.composer} value={body} onChange={setBody} onSubmit={() => { void send(); }}
    input={<MarkdownEditor key={sent} value={body} onChange={setBody} label="댓글" minHeight="2.75rem" autoFocus={sent > 0} isDisabled={isBusy}
      placeholder="댓글을 남기세요…" onSubmit={() => { void send(); }} />}
    sendButton={<ChatSendButton size="sm" onSend={() => { void send(); }} isDisabled={!body.trim() || isBusy} />} />;
}
