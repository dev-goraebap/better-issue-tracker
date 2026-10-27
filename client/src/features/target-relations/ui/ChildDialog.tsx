import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
import { createChild } from '@/entities/relation';
import styles from './relations.module.css';

export function ChildDialog({ workspaceId, projectId, parentId, parentTitle, onSaved, onClose }: {
  workspaceId: string; projectId: string; parentId: string; parentTitle: string; onSaved: () => Promise<unknown>; onClose: () => void;
}) {
  const [title, setTitle] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!title.trim() || isBusy) return;
    setBusy(true); setError('');
    try { await createChild(workspaceId, projectId, parentId, title.trim()); await onSaved(); onClose(); }
    catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <CompactDialog title="하위 작업 만들기" subtitle={parentTitle} isBusy={isBusy} onClose={onClose} onSubmit={() => { void save(); }}
    footer={<><Button label="취소" variant="ghost" isDisabled={isBusy} onClick={onClose} /><Button type="submit" label="만들기" isDisabled={!title.trim()} isLoading={isBusy} /></>}>
    <TextInput label="작업 제목" placeholder="하위 작업 제목" value={title} onChange={setTitle} hasAutoFocus isRequired isDisabled={isBusy} />
    <p className={styles.hint}>시작 전 · 미배정으로 만듭니다.</p>
    <FormMessage message={error} />
  </CompactDialog>;
}
