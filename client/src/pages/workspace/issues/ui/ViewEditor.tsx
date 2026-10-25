import { useState } from 'react';
import { Button, Switch } from '@astryxdesign/core';
import { MarkPicker } from '@/shared/ui';
import styles from './views.module.css';

export type ViewDraft = { name: string; description: string; icon: string; color: string; isPersonal: boolean };

/**
 * Making or changing a view, as Linear's: a card over the list rather than a dialog, the view's mark (its icon and colour,
 * picked in a small popover, MarkPicker) beside its name, a description if wanted, and '나만 보기' for a personal view (D-068);
 * 취소 and the save at the end. The view takes the list's conditions as they stand (filters, layout, order, columns).
 */
export function ViewEditor({ initial, mode, onCancel, onSave }: {
  initial: ViewDraft; mode: 'create' | 'edit'; onCancel: () => void; onSave: (draft: ViewDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const set = (patch: Partial<ViewDraft>) => setDraft(previous => ({ ...previous, ...patch }));
  const save = () => { if (draft.name.trim()) onSave({ ...draft, name: draft.name.trim() }); };
  return <form className={styles.editor} aria-label={mode === 'create' ? '새 뷰' : '뷰 고치기'} onSubmit={event => { event.preventDefault(); save(); }}
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onCancel(); } }}>
    <MarkPicker value={{ icon: draft.icon, color: draft.color }} label="아이콘과 색 고르기" onChange={set} />
    <div className={styles.fields}>
      <input className={styles.name} value={draft.name} placeholder="뷰 이름" aria-label="뷰 이름" autoFocus onChange={event => set({ name: event.target.value })} />
      <input className={styles.description} value={draft.description} placeholder="설명 (선택)" aria-label="설명" onChange={event => set({ description: event.target.value })} />
    </div>
    <div className={styles.editorEnd}>
      <Switch label="나만 보기" size="sm" value={draft.isPersonal} onChange={isPersonal => set({ isPersonal })} />
      <Button label="취소" variant="ghost" size="sm" onClick={onCancel} />
      <Button type="submit" label={mode === 'create' ? '뷰 만들기' : '저장'} variant="primary" size="sm" isDisabled={!draft.name.trim()} />
    </div>
  </form>;
}
