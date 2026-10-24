import { useState } from 'react';
import { Button, Popover, Switch } from '@astryxdesign/core';
import { NavIcon } from '@/shared/ui';
import { PALETTE } from '@/shared/config';
import { VIEW_ICONS } from '@/entities/work-item';
import styles from './views.module.css';

export type ViewDraft = { name: string; description: string; icon: string; color: string; isPersonal: boolean };

/**
 * Making or changing a view, as Linear's: a card over the list rather than a dialog, the view's mark (its icon and colour,
 * picked in a small popover) beside its name, a description if wanted, and '나만 보기' for a personal view (D-068);
 * 취소 and the save at the end. The view takes the list's conditions as they stand (filters, layout, order, columns).
 */
export function ViewEditor({ initial, mode, onCancel, onSave }: {
  initial: ViewDraft; mode: 'create' | 'edit'; onCancel: () => void; onSave: (draft: ViewDraft) => void;
}) {
  const [draft, setDraft] = useState(initial);
  const [isPicking, setPicking] = useState(false);
  const set = (patch: Partial<ViewDraft>) => setDraft(previous => ({ ...previous, ...patch }));
  const save = () => { if (draft.name.trim()) onSave({ ...draft, name: draft.name.trim() }); };
  return <form className={styles.editor} aria-label={mode === 'create' ? '새 뷰' : '뷰 고치기'} onSubmit={event => { event.preventDefault(); save(); }}
    onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); onCancel(); } }}>
    <Popover isOpen={isPicking} onOpenChange={setPicking} placement="below" alignment="start" width={248} label="뷰 아이콘" className={styles.pickerPopover}
      content={<div className={styles.picker}>
        <div className={styles.colors} role="group" aria-label="색">
          {PALETTE.map(color => <button key={color.value} type="button" aria-pressed={draft.color === color.value} aria-label={color.name}
            className={styles.color} style={{ background: color.value }} onClick={() => set({ color: color.value })} />)}
        </div>
        <div className={styles.icons} role="group" aria-label="아이콘">
          {VIEW_ICONS.map(icon => <button key={icon} type="button" aria-pressed={draft.icon === icon} aria-label={icon}
            className={styles.icon} style={{ color: draft.color }} onClick={() => { set({ icon }); setPicking(false); }}><NavIcon name={icon} /></button>)}
        </div>
      </div>}>
      {({ ref, onClick }) => <span ref={ref} className={styles.markWrap}>
        <button type="button" className={styles.mark} style={{ color: draft.color }} aria-label="아이콘과 색 고르기" aria-expanded={isPicking} onClick={onClick}><NavIcon name={draft.icon} /></button>
      </span>}
    </Popover>
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
