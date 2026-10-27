import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { authError } from '@/shared/api';
import { NavIcon } from '@/shared/ui';
import { createChild } from '@/entities/relation';
import styles from './relations.module.css';

export function ChildComposer({ workspaceId, projectId, parentId, onSaved, onClose }: {
  workspaceId: string; projectId: string; parentId: string; onSaved: () => Promise<unknown>; onClose: () => void;
}) {
  const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const save = async () => {
    if (busy || !title.trim()) return;
    setBusy(true); setError('');
    try { await createChild(workspaceId, projectId, parentId, title.trim()); setTitle(''); await onSaved(); }
    catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <form className={styles.childComposer} aria-label="하위 작업 만들기" onSubmit={event => { event.preventDefault(); void save(); }}>
    <div className={styles.childTitle}><NavIcon name="status" /><input autoFocus aria-label="하위 작업 제목" placeholder="하위 작업 제목" value={title} maxLength={200} disabled={busy} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && !busy) onClose(); }} /></div>
    <div className={styles.childFoot}><span>시작 전 · 미배정</span><Button label="닫기" variant="ghost" size="sm" isDisabled={busy} onClick={onClose} /><Button type="submit" label="만들기" size="sm" isDisabled={!title.trim()} isLoading={busy} /></div>
    {error && <p className={styles.hint} role="alert">{error}</p>}
  </form>;
}
