import { useState } from 'react';
import { Button, MoreMenu } from '@astryxdesign/core';
import { agoText } from '@/shared/lib/date-text';
import { DefaultAvatar, MarkdownEditor, MarkdownView, NavIcon } from '@/shared/ui';
import type { TimelineEntry } from '../api/timeline';
import { actorText } from '../model/activity-text';
import styles from './activity.module.css';

/**
 * A comment in the work item's timeline (D-078), as Linear's: a card with the person's picture, name and when (수정됨 when
 * edited), the Markdown read as written. Its author may 수정 it in place (the same editor, Ctrl + Enter saves) and
 * delete it; someone who manages the workspace may delete anyone's.
 */
export function CommentCard({ entry, canEdit, canDelete, onSave, onDelete }: {
  entry: TimelineEntry; canEdit: boolean; canDelete: boolean; onSave: (body: string) => Promise<boolean>; onDelete: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [isBusy, setBusy] = useState(false);
  const save = async () => {
    if (draft === null || !draft.trim() || isBusy) return;
    setBusy(true);
    if (await onSave(draft)) setDraft(null);
    setBusy(false);
  };
  const items = [
    ...(canEdit ? [{ label: '수정', icon: <NavIcon name="edit" />, onClick: () => setDraft(entry.body ?? '') }] : []),
    ...(canDelete ? [{ label: '삭제', icon: <NavIcon name="delete" />, onClick: onDelete }] : []),
  ];
  return <li className={styles.comment}>
    <article className={styles.card} aria-label={`${entry.actorName ?? ''}의 댓글`}>
      <header className={styles.cardHead}>
        {entry.actorId && <DefaultAvatar seed={entry.actorId} name={entry.actorName ?? ''} size={20} />}
        <span className={styles.actor}>{actorText(entry)}</span>
        <time className={styles.time} dateTime={entry.at} title={new Date(entry.at).toLocaleString('ko-KR')}>{agoText(entry.at)}</time>
        {entry.editedAt && <span className={styles.time} title={new Date(entry.editedAt).toLocaleString('ko-KR')}>· 수정됨</span>}
        {items.length > 0 && draft === null && <span className={styles.cardMenu}><MoreMenu label="댓글 메뉴" variant="ghost" size="sm" placement="end" items={items} /></span>}
      </header>
      {draft === null ? <div className={styles.cardBody}><MarkdownView value={entry.body ?? ''} /></div> : <div className={styles.cardEdit}>
        <MarkdownEditor value={draft} onChange={setDraft} label="댓글 고치기" variant="field" autoFocus onSubmit={() => { void save(); }} isDisabled={isBusy} />
        <div className={styles.actions}>
          <Button label="취소" variant="ghost" size="sm" onClick={() => setDraft(null)} isDisabled={isBusy} />
          <Button label="저장" variant="primary" size="sm" onClick={() => { void save(); }} isLoading={isBusy} isDisabled={!draft.trim()} />
        </div>
      </div>}
    </article>
  </li>;
}
