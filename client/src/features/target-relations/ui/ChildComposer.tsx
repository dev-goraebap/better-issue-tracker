import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { NavIcon, PropertyPicker } from '@/shared/ui';
import { createChild } from '@/entities/relation';
import { childTypeOf, childTypesOf, typeOptions, workItemTypesQuery } from '@/entities/work-item-type';
import styles from './relations.module.css';

/**
 * 하위 작업 추가 in place: a title, and its type among those that may sit under the parent's (D-104), starting as the
 * workspace's default when it may, else the first that may. A parent no type may sit under says so instead of the form.
 */
export function ChildComposer({ workspaceId, projectId, parentId, parentTypeId, onSaved, onClose }: {
  workspaceId: string; projectId: string; parentId: string; parentTypeId: string | null; onSaved: () => Promise<unknown>; onClose: () => void;
}) {
  const [title, setTitle] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [picked, setPicked] = useState<string>();
  const types = useQuery(workItemTypesQuery(workspaceId));
  const allowed = parentTypeId ? childTypesOf(parentTypeId, types.data ?? []) : [];
  const type = allowed.find(each => each.id === picked) ?? (parentTypeId ? childTypeOf(parentTypeId, allowed) : undefined);
  const save = async () => {
    if (busy || !title.trim() || !type) return;
    setBusy(true); setError('');
    try { await createChild(workspaceId, projectId, parentId, title.trim(), type.id); setTitle(''); await onSaved(); }
    catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  if (types.data && !type) return <div className={styles.childComposer} role="status">
    <p className={styles.hint}>이 업무의 유형 밑에 둘 수 있는 유형이 없어 하위 작업을 만들 수 없습니다. 워크스페이스 설정의 업무 유형에서 바꿀 수 있습니다.</p>
    <div className={styles.childFoot}><span /><Button label="닫기" variant="ghost" size="sm" onClick={onClose} /></div>
  </div>;
  return <form className={styles.childComposer} aria-label="하위 작업 만들기" onSubmit={event => { event.preventDefault(); void save(); }}>
    <div className={styles.childTitle}><NavIcon name="status" /><input autoFocus aria-label="하위 작업 제목" placeholder="하위 작업 제목" value={title} maxLength={200} disabled={busy} onChange={event => setTitle(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && !busy) onClose(); }} /></div>
    <div className={styles.childFoot}>
      <span className={styles.childMeta}>
        {type && <PropertyPicker label="유형" icon="tasks" options={typeOptions(allowed)} value={type.id} onChange={value => { if (value) setPicked(value as string); }} />}
        시작 전 · 미배정
      </span>
      <Button label="닫기" variant="ghost" size="sm" isDisabled={busy} onClick={onClose} /><Button type="submit" label="만들기" size="sm" isDisabled={!title.trim() || !type} isLoading={busy} />
    </div>
    {error && <p className={styles.hint} role="alert">{error}</p>}
  </form>;
}
