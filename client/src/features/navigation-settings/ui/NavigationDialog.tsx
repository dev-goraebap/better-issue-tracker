import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, authError } from '@/shared/api';
import { CompactDialog, FormMessage, NavIcon } from '@/shared/ui';
import { navigationQuery, saveNavigation, scopeMenu, type Navigation, type NavigationEntry } from '@/entities/navigation';
import { rowReorderStyles as rows, useRowReorder } from '@/shared/lib/row-reorder';
import styles from './navigation-settings.module.css';

export function NavigationDialog({ initial, workspaceId, projectId, onClose }: { initial: Navigation; workspaceId: string; projectId?: string; onClose: () => void }) {
  const [entries, setEntries] = useState<NavigationEntry[]>(initial.entries); const [version, setVersion] = useState(initial.version); const [conflict, setConflict] = useState(false); const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const client = useQueryClient();
  const reorder = useRowReorder(entries.map(entry => ({ id: entry.key, name: entry.label })), { word: '메뉴', object: '메뉴를', topic: '메뉴는' }, rows.ghost,
    async order => { setEntries(current => order.map(key => current.find(entry => entry.key === key)!)); }, failure => setError(authError(failure)));
  const shown = reorder.order.map(key => entries.find(entry => entry.key === key)!);
  const submit = async () => { if (busy) return; setBusy(true); setError(''); try { await saveNavigation(workspaceId, projectId, { expectedVersion: version, entries }); await client.invalidateQueries({ queryKey: navigationQuery(workspaceId, projectId).queryKey }); onClose(); } catch (failure) { setError(authError(failure)); if (failure instanceof ApiError && failure.status === 409) setConflict(true); } finally { setBusy(false); } };
  return <CompactDialog title="메뉴 구성" subtitle="이 공간의 모든 구성원에게 적용됩니다. 메뉴 이름과 순서를 바꿔도 주소와 권한은 유지됩니다." onClose={onClose} onSubmit={() => void submit()}
    footer={<><Button label="기본값으로" variant="ghost" onClick={() => setEntries(scopeMenu(undefined, !!projectId).map(item => ({ key: item.path.slice(1), label: item.label })))} /><Button label="취소" variant="ghost" onClick={onClose} /><Button type="submit" label="저장" isLoading={busy} isDisabled={conflict || entries.some(entry => !entry.label.trim())} /></>}>
    <FormMessage message={error} />{conflict && <><p>다른 관리자가 메뉴를 변경했습니다. 다시 불러오면 현재 입력을 최신 구성으로 바꿉니다.</p><Button label="최신 구성 다시 불러오기" variant="secondary" onClick={() => { void client.fetchQuery({ ...navigationQuery(workspaceId, projectId), staleTime: 0 }).then(latest => { setEntries(latest.entries); setVersion(latest.version); setConflict(false); setError(''); }).catch(failure => setError(authError(failure))); }} /></>}<div ref={reorder.list} className={rows.list} role="list" aria-label="메뉴 순서">{shown.map(entry => <div className={`${rows.row} ${styles.row}`} role="listitem" {...reorder.rowProps(entry.key)} key={entry.key}><button type="button" className={rows.grip} disabled={busy} {...reorder.gripProps({ id: entry.key, name: entry.label })}><NavIcon name="grip" /></button><TextInput label={`${scopeMenu(undefined, !!projectId).find(item => item.path === `/${entry.key}`)?.label ?? entry.label} 메뉴 이름`} isLabelHidden isDisabled={busy} value={entry.label} onChange={label => setEntries(entries.map(item => item.key === entry.key ? { ...item, label: label.slice(0, 32) } : item))} />
    </div>)}</div>
    <span className={styles.spoken} id={reorder.hint}>끌어서 순서를 바꿉니다. Alt와 위아래 화살표도 사용할 수 있으며, 끄는 동안 Esc는 취소입니다.</span>
    <span className={styles.spoken} role="status" aria-live="polite">{reorder.said}</span>
  </CompactDialog>;
}
