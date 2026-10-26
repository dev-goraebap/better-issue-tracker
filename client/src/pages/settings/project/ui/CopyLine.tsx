import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { SettingsAction } from '@/shared/ui';
import styles from './project-settings.module.css';

/** A value to copy (the webhook's address or secret), the secret dotted until asked. */
export function CopyLine({ label, value, isSecret = false, onCopy }: { label: string; value: string; isSecret?: boolean; onCopy: () => void }) {
  const [isShown, setShown] = useState(!isSecret);
  return <div className={styles.copyLine}>
    <span className={styles.copyLabel}>{label}</span>
    <code className={styles.copyValue}>{isShown ? value : '•'.repeat(24)}</code>
    {isSecret && <Button label={isShown ? '가리기' : '보기'} variant="ghost" size="sm" onClick={() => setShown(!isShown)} />}
    <SettingsAction label={`${label} 복사`} tooltip="복사" icon="copy" onClick={onCopy} />
  </div>;
}
