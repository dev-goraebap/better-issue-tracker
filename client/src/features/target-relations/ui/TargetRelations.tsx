import { useState } from 'react';
import { Button, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { ConfirmDialog, FormMessage, MoreMenu, NavIcon, SettingsAction } from '@/shared/ui';
import { connectTargets, relationsQuery, refreshRelations, unlinkTargets, type Candidate, type Relation, type RelationType } from '@/entities/relation';
import { RelationSection } from './RelationSection';
import { RelationPicker } from './RelationPicker';
import { ChildComposer } from './ChildComposer';
import styles from './relations.module.css';

export function TargetRelations({ workspaceId, projectId, type, id, title, canWrite, typeId }: {
  workspaceId: string; projectId?: string | null; type: RelationType; id: string; title: string; canWrite: boolean;
  /** A work item's own type (D-104), which decides the types its subtasks may be. */
  typeId?: string | null;
}) {
  const client = useQueryClient();
  const result = useQuery(relationsQuery(workspaceId, type, id));
  const [picker, setPicker] = useState<'child' | 'parent' | 'document' | 'work_item' | null>(null);
  const [creating, setCreating] = useState(false);
  const [removing, setRemoving] = useState<Relation | null>(null);
  const [busy, setBusy] = useState<string>();
  const [error, setError] = useState('');
  const items = result.data ?? [];
  const children = items.filter(item => item.relation === 'subtask_of' && !item.outgoing);
  const parents = items.filter(item => item.relation === 'subtask_of' && item.outgoing);
  const refresh = () => refreshRelations(client, workspaceId);
  const connect = async (target: Candidate) => {
    const child = picker === 'child';
    await connectTargets(workspaceId, { fromType: child ? target.type : type, fromId: child ? target.id : id,
      relation: child || picker === 'parent' ? 'subtask_of' : type === 'document' && target.type === 'document' ? 'references' : 'relates_to',
      toType: child ? type : target.type, toId: child ? id : target.id });
    await refresh();
  };
  const remove = async () => {
    if (!removing) return;
    const item = removing; setRemoving(null); setBusy(item.linkId); setError('');
    try { await unlinkTargets(workspaceId, item.linkId); }
    catch (failure) { setError(authError(failure)); }
    finally { await refresh(); setBusy(undefined); }
  };
  const action = (label: string, run: () => void) => <SettingsAction label={label} tooltip={label} icon="plus" onClick={run} />;
  if (result.isPending) return <p className={styles.hint} role="status">연결 정보를 불러오는 중…</p>;
  if (!result.data) return <div><FormMessage message={authError(result.error)} /><Button label="다시 시도" variant="ghost" size="sm" onClick={() => { void result.refetch(); }} /></div>;
  if (!canWrite && !items.length && !result.error) return null;
  const outwardDocs = items.filter(item => item.type === 'document' && (type === 'work_item' || item.outgoing));
  const incomingDocs = items.filter(item => item.type === 'document' && !item.outgoing);
  const workLinks = items.filter(item => item.type === 'work_item' && item.relation === 'relates_to');
  return <VStack gap={5}>
    {canWrite && <div className={styles.toolbar} role="toolbar" aria-label="연결 추가">
      {type === 'work_item' && projectId && <Button label="하위 작업 추가" icon={<NavIcon name="list" />} variant="ghost" size="sm" onClick={() => setCreating(true)} />}
      <Button label={type === 'document' ? '업무 연결' : '문서 연결'} icon={<NavIcon name={type === 'document' ? 'link' : 'document'} />} variant="ghost" size="sm" onClick={() => setPicker(type === 'document' ? 'work_item' : 'document')} />
      {type === 'document' && <Button label="문서 참조" icon={<NavIcon name="document" />} variant="ghost" size="sm" onClick={() => setPicker('document')} />}
      {type === 'work_item' && <MoreMenu label="작업 관계 추가" variant="ghost" items={[
        { label: '기존 하위 작업 연결', icon: <NavIcon name="link" />, onClick: () => setPicker('child') },
        ...(!parents.length ? [{ label: '상위 작업 연결', icon: <NavIcon name="branch" />, onClick: () => setPicker('parent') }] : []),
      ]} />}
    </div>}
    {type === 'work_item' && children.length > 0 && <RelationSection workspaceId={workspaceId} title="하위 작업" items={children} hint=""
      progress={{ done: children.filter(item => item.category === 'done').length, total: children.filter(item => item.category !== 'canceled').length }} busy={busy} onRemove={canWrite ? setRemoving : undefined}
      actions={canWrite && projectId ? action('하위 작업 추가', () => setCreating(true)) : undefined} />}
    {creating && projectId && <ChildComposer workspaceId={workspaceId} projectId={projectId} parentId={id} parentTypeId={typeId ?? null} onSaved={refresh} onClose={() => setCreating(false)} />}
    {(type === 'document' ? workLinks.length > 0 : outwardDocs.length > 0) && <RelationSection workspaceId={workspaceId} title={type === 'document' ? '연결된 업무' : '연결 자료'}
      items={type === 'document' ? workLinks : outwardDocs} hint="" onRemove={canWrite ? setRemoving : undefined} busy={busy}
      actions={canWrite ? action(type === 'document' ? '업무 연결' : '문서 연결', () => setPicker(type === 'document' ? 'work_item' : 'document')) : undefined} />}
    {type === 'document' && <>
      {outwardDocs.length > 0 && <RelationSection workspaceId={workspaceId} title="참조한 문서" items={outwardDocs} hint=""
        actions={canWrite ? action('문서 참조', () => setPicker('document')) : undefined} onRemove={canWrite ? setRemoving : undefined} busy={busy} />}
      {incomingDocs.length > 0 && <RelationSection workspaceId={workspaceId} title="이 문서를 참조하는 문서" items={incomingDocs} hint="" />}
    </>}
    <FormMessage message={error || (result.error ? authError(result.error) : '')} />
    {picker && <RelationPicker workspaceId={workspaceId} type={picker === 'document' ? 'document' : 'work_item'}
      title={picker === 'child' ? '기존 하위 작업 연결' : picker === 'parent' ? '상위 작업 연결' : picker === 'document' ? '문서 연결' : '업무 연결'}
      excluded={[id, ...items.filter(item => picker === 'child' ? item.relation === 'subtask_of' && !item.outgoing : picker === 'parent' ? item.relation === 'subtask_of' && item.outgoing : item.relation !== 'mentions').map(item => item.id)]}
      onSelect={connect} onClose={() => setPicker(null)} />}

    {removing && <ConfirmDialog title="연결을 해제할까요?" description={`'${removing.title}'과의 연결만 해제합니다. 업무와 문서는 그대로 남습니다.`}
      confirmLabel="연결 해제" onClose={() => setRemoving(null)} onConfirm={() => { void remove(); }} />}
  </VStack>;
}
