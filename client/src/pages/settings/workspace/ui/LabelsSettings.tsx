import { useState } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_MARK_COLOR, PALETTE } from '@/shared/config';
import { ApiError, authError } from '@/shared/api';
import { CompactDialog, ConfirmDialog, FormMessage, NavIcon, QueryMessage, SettingsAction, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { createLabel, deleteLabel, labelsQuery, refreshLabels, updateLabel, type Label } from '@/entities/label';
import styles from './workspace-settings.module.css';

type Draft = { from?: Label; name: string; color: string };

/**
 * 라벨: the workspace's labels, shared by all its projects (D-009), each its colour and name. 새 라벨 and 고치기 open the
 * same short dialog (a name required and not taken, a colour); 삭제 asks first and takes the label off its work items. The
 * system label (결정기록, D-066) keeps its name and cannot be deleted; its colour may change. A viewer reads them.
 */
export function LabelsSettings({ workspaceId, canWrite }: { workspaceId: string; canWrite: boolean }) {
  const client = useQueryClient();
  const labels = useQuery(labelsQuery(workspaceId));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isChecked, setChecked] = useState(false);
  const [takenName, setTakenName] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Label | null>(null);
  const [deleteError, setDeleteError] = useState<Error | null>(null);
  const name = draft?.name.trim() ?? '';
  const nameError = isChecked && draft ? (!name ? '라벨 이름을 입력해 주세요.' : name === takenName ? '같은 이름의 라벨이 있습니다.' : undefined) : undefined;
  const close = () => { if (isBusy) return; setDraft(null); setChecked(false); setTakenName(''); setError(''); };
  const save = async () => {
    setChecked(true);
    if (!draft || !name || name === takenName || isBusy) return;
    setBusy(true); setError('');
    try {
      if (draft.from) await updateLabel(workspaceId, draft.from.id, { expectedVersion: draft.from.version, ...(draft.from.system ? {} : { name }), color: draft.color });
      else await createLabel(workspaceId, { name, color: draft.color });
      await refreshLabels(client, workspaceId);
      setDraft(null); setChecked(false);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'LABEL_NAME_CONFLICT') setTakenName(name);
      else setError(authError(failure));
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || isBusy) return;
    setBusy(true); setDeleteError(null);
    try { await deleteLabel(workspaceId, deleting.id, deleting.version); await refreshLabels(client, workspaceId); setDeleting(null); }
    catch (failure) { setDeleteError(new Error(authError(failure))); }
    finally { setBusy(false); }
  };
  const list = labels.data ?? [];
  return <VStack gap={8}>
    <SettingsHead title="라벨" description="이 워크스페이스의 모든 프로젝트가 같은 라벨을 씁니다." />
    {!labels.data ? <QueryMessage pending={labels.isPending} error={labels.error} retry={() => { void labels.refetch(); }} />
      : <SettingsCard title={`라벨 ${list.length}개`} id="labels-list"
        actions={canWrite ? <Button label="새 라벨" variant="secondary" size="sm" icon={<NavIcon name="plus" />} onClick={() => setDraft({ name: '', color: DEFAULT_MARK_COLOR })} /> : undefined}>
        {list.map(label => <SettingsRow key={label.id} lead={<span className={styles.swatch} style={{ background: label.color }} aria-hidden="true" />}
          label={<>{label.name}{label.system && <span className={styles.system}>시스템</span>}</>}
          description={label.system ? '결정의 상태와 기각한 대안을 갖는 라벨입니다. 이름을 바꾸거나 지울 수 없습니다.' : undefined}>
          {canWrite && <span className={styles.rowActions}>
            <SettingsAction label={`${label.name} 고치기`} tooltip="고치기" icon="edit" onClick={() => setDraft({ from: label, name: label.name, color: label.color })} />
            {!label.system && <SettingsAction label={`${label.name} 삭제`} tooltip="삭제" icon="delete" tone="danger" onClick={() => setDeleting(label)} />}
          </span>}
        </SettingsRow>)}
      </SettingsCard>}
    <CompactDialog isOpen={!!draft} title={draft?.from ? '라벨 고치기' : '새 라벨'} width={520} isBusy={isBusy} onClose={close} onSubmit={() => { void save(); }}
      footer={<><Button label="취소" variant="ghost" onClick={close} isDisabled={isBusy} /><Button type="submit" label={draft?.from ? '저장' : '라벨 만들기'} variant="primary" isLoading={isBusy} /></>}>
      <TextInput label="이름" value={draft?.name ?? ''} onChange={value => draft && setDraft({ ...draft, name: value })} isRequired hasAutoFocus
        isDisabled={isBusy || !!draft?.from?.system} placeholder="예: 성능" status={nameError ? { type: 'error', message: nameError } : undefined} />
      <fieldset className={styles.colors}>
        <legend className={styles.colorsLegend}>색</legend>
        {PALETTE.map(color => <button key={color.value} type="button" className={styles.colorChoice} style={{ background: color.value }} aria-label={color.name}
          aria-pressed={draft?.color === color.value} onClick={() => draft && setDraft({ ...draft, color: color.value })} />)}
      </fieldset>
      <FormMessage message={error} />
    </CompactDialog>
    {deleting && <ConfirmDialog title={`'${deleting.name}' 라벨을 삭제할까요?`} description="이 라벨을 단 업무에서 라벨이 빠집니다. 업무는 그대로 남습니다." confirmLabel="삭제" variant="destructive"
      isPending={isBusy} error={deleteError} onClose={() => { setDeleting(null); setDeleteError(null); }} onConfirm={() => { void remove(); }} />}
  </VStack>;
}
