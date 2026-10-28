import { useEffect } from 'react';
import { Button } from '@astryxdesign/core';
import styles from './inline-edit.module.css';

/**
 * The bar that rises at the foot of the screen while a detail holds unsaved words (D-107), as Discord's settings do:
 * what is waiting, 되돌리기 and 저장, and Ctrl (⌘) + S saves. The reason a save failed shows in it.
 */
export function SaveBar({ isBusy, error, onUndo, onSave }: { isBusy: boolean; error?: string; onUndo: () => void; onSave: () => void }) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); onSave(); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [onSave]);
  return <div className={styles.saveBar} role="region" aria-label="저장하지 않은 변경 사항">
    <div className={styles.saveBarInner}>
      <p className={styles.saveText} role="status">{error || '저장하지 않은 변경 사항이 있습니다'}</p>
      <Button label="되돌리기" variant="ghost" size="sm" onClick={onUndo} isDisabled={isBusy} />
      <Button label="저장" variant="primary" size="sm" onClick={onSave} isLoading={isBusy} />
    </div>
  </div>;
}
