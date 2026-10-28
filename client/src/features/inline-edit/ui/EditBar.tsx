import { useEffect } from 'react';
import { Button } from '@astryxdesign/core';
import { NavIcon } from '@/shared/ui';
import styles from './inline-edit.module.css';

/**
 * The bar at the foot of the screen for writing a detail's title and body (D-109). Read, after a press on them, it hints
 * how to write them (두 번 클릭), with 고치기. While writing it says so (편집 모드): 보기로 전환 when nothing changed,
 * else 취소 (dropping what changed) and 저장, which Ctrl (⌘) + S also does. The reason a save failed shows in it.
 */
export function EditBar({ isEditing, isChanged, isBusy, error, onEdit, onView, onCancel, onSave }: {
  isEditing: boolean; isChanged: boolean; isBusy: boolean; error?: string;
  onEdit: () => void; onView: () => void; onCancel: () => void; onSave: () => void;
}) {
  useEffect(() => {
    if (!isEditing) return undefined;
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); onSave(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [isEditing, onSave]);
  if (!isEditing) return <div className={styles.saveBar} role="region" aria-label="고치기 안내">
    <div className={styles.saveBarInner}>
      <p className={styles.saveText} role="status"><span className={styles.saveMark}><NavIcon name="edit" /></span>두 번 클릭하면 편집 모드로 전환합니다</p>
      <Button label="고치기" variant="primary" size="sm" onClick={onEdit} />
    </div>
  </div>;
  return <div className={styles.saveBar} role="region" aria-label="편집 모드">
    <div className={styles.saveBarInner} data-editing>
      <p className={styles.saveText} role="status">
        <span className={styles.saveMark}><NavIcon name="edit" /></span>
        <span>{error || <><strong>편집 모드</strong>{isChanged && <span className={styles.saveNote}> · 저장하지 않은 변경 사항이 있습니다</span>}</>}</span>
      </p>
      {isChanged
        ? <><Button label="취소" variant="ghost" size="sm" onClick={onCancel} isDisabled={isBusy} />
          <Button label="저장" variant="primary" size="sm" onClick={onSave} isLoading={isBusy} /></>
        : <Button label="보기로 전환" variant="secondary" size="sm" onClick={onView} />}
    </div>
  </div>;
}
