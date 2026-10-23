import { useId, useRef, useState } from 'react';
import { Button, Text } from '@astryxdesign/core';
import { NavIcon } from '@/shared/ui';
import { WorkspaceMark } from '@/entities/demo-sample';
import styles from './workspace-switcher.module.css';

const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
const MAX_BYTES = 1024 * 1024;

/**
 * A workspace's logo in a form: the mark as it will look (the chosen image, or the name's first letter until one is
 * chosen), a button to choose a PNG, JPG, WebP or SVG up to 1MB and one to take it off. A file of another kind or size
 * is refused with the reason under the field, and the mark keeps what it had.
 */
export function LogoField({ name, value, onChange }: { name: string; value?: string; onChange: (logo: string | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const hintId = useId();
  const [error, setError] = useState('');
  const choose = (file?: File) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) { setError('PNG, JPG, WebP, SVG 이미지만 쓸 수 있습니다.'); return; }
    if (file.size > MAX_BYTES) { setError('1MB 이하의 이미지를 골라 주세요.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setError(''); onChange(String(reader.result)); };
    reader.readAsDataURL(file);
  };
  return <div className={styles.logoField} role="group" aria-label="로고" aria-describedby={hintId}>
    <WorkspaceMark workspace={{ name: name || '?', logo: value, tone: 0 }} size="lg" />
    <div className={styles.logoText}>
      <Text weight="semibold">로고</Text>
      <Text id={hintId} type="supporting" color={error ? undefined : 'secondary'} role={error ? 'alert' : undefined} className={error ? styles.error : undefined}>
        {error || '정사각형 PNG·JPG·WebP·SVG, 1MB 이하. 없으면 이름의 첫 글자로 보입니다.'}
      </Text>
      <span className={styles.logoActions}>
        <Button label={value ? '바꾸기' : '이미지 올리기'} variant="secondary" size="sm" icon={<NavIcon name="attach" />} onClick={() => input.current?.click()} />
        {value && <Button label="지우기" variant="ghost" size="sm" onClick={() => { setError(''); onChange(undefined); }} />}
      </span>
      <input ref={input} type="file" accept={TYPES.join(',')} hidden onChange={event => { choose(event.target.files?.[0]); event.target.value = ''; }} />
    </div>
  </div>;
}
