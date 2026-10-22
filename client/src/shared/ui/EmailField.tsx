import { useId } from 'react';
import styles from './auth.module.css';
export function EmailField({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  const id = useId();
  return <label className={styles.emailLabel} htmlFor={id}>이메일
    <input id={id} className={styles.emailInput} name="email" type="email" autoComplete="username" required
      placeholder="예: you@example.com" maxLength={256} value={value} onChange={event => onChange(event.target.value)} disabled={disabled} />
  </label>;
}
