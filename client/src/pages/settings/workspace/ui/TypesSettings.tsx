import { useState } from 'react';
import { Button, Switch, TextInput, VStack, useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_MARK_COLOR, PALETTE } from '@/shared/config';
import { ApiError, authError, type components } from '@/shared/api';
import { CompactDialog, ConfirmDialog, FormMessage, NavIcon, QueryMessage, SettingsAction, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import {
  createWorkItemType, deleteWorkItemType, refreshWorkItemTypes, reorderWorkItemTypes, ruleText, TYPE_ICONS, TypeMark, updateWorkItemType, workItemTypesQuery,
  type WorkItemType,
} from '@/entities/work-item-type';
import { useRowReorder } from '@/shared/lib/row-reorder';
import moving from '@/shared/lib/row-reorder/row-reorder.module.css';
import styles from './workspace-settings.module.css';

type Draft = { from?: WorkItemType; name: string; icon: string; color: string; parents: string[]; isRequired: boolean; isDefault: boolean };

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(each => b.includes(each));

/**
 * 업무 유형: the workspace's work item types (D-104), each its mark (an icon in a colour), its name and the rule of where it
 * may sit: the types it may go under, and whether it must. Every task has one, the default when none is named; an event
 * has none. 새 유형 and 고치기 open the same short dialog; the server refuses a rule the live work items would break and
 * says why under it. The default type and a type work items use cannot be deleted, so they offer no 삭제. Rows move by
 * dragging or Alt with the arrows, which is the order the menus show. Changing them takes the settings permission; a
 * member without it reads them.
 */
export function TypesSettings({ workspaceId, canWrite }: { workspaceId: string; canWrite: boolean }) {
  const client = useQueryClient();
  const types = useQuery(workItemTypesQuery(workspaceId));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [isChecked, setChecked] = useState(false);
  const [takenName, setTakenName] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<WorkItemType | null>(null);
  const [deleteError, setDeleteError] = useState<Error | null>(null);
  const list = types.data ?? [];
  const name = draft?.name.trim() ?? '';
  const nameError = isChecked && draft ? (!name ? '유형 이름을 입력해 주세요.' : name === takenName ? '같은 이름의 유형이 있습니다.' : undefined) : undefined;
  const set = (patch: Partial<Draft>) => setDraft(previous => (previous ? { ...previous, ...patch } : previous));
  const open = (from?: WorkItemType) => setDraft(from
    ? { from, name: from.name, icon: from.icon || TYPE_ICONS[0]!.value, color: from.color, parents: [...from.allowedParentTypeIds], isRequired: from.parentRequired, isDefault: from.isDefault }
    : { name: '', icon: TYPE_ICONS[0]!.value, color: DEFAULT_MARK_COLOR, parents: [], isRequired: false, isDefault: false });
  const close = () => { if (isBusy) return; setDraft(null); setChecked(false); setTakenName(''); setError(''); };
  const save = async () => {
    setChecked(true);
    if (!draft || !name || name === takenName || isBusy) return;
    // The parents in the workspace's order; a type without one cannot require one.
    const parents = list.filter(type => draft.parents.includes(type.id)).map(type => type.id);
    const isRequired = draft.isRequired && parents.length > 0 && !draft.isDefault;
    setBusy(true); setError('');
    try {
      const from = draft.from;
      if (from) {
        const changes: Omit<components['schemas']['UpdateWorkItemType'], 'expectedVersion'> = {
          ...(name !== from.name ? { name } : {}),
          ...(draft.icon !== from.icon ? { icon: draft.icon } : {}),
          ...(draft.color !== from.color ? { color: draft.color } : {}),
          ...(!sameSet(parents, from.allowedParentTypeIds) ? { allowedParentTypeIds: parents } : {}),
          ...(isRequired !== from.parentRequired ? { parentRequired: isRequired } : {}),
          // The default stops being one only when another becomes it, so only becoming it is sent.
          ...(draft.isDefault && !from.isDefault ? { isDefault: true } : {}),
        };
        if (Object.keys(changes).length) await updateWorkItemType(workspaceId, from.id, { expectedVersion: from.version, ...changes });
      } else await createWorkItemType(workspaceId, { name, icon: draft.icon, color: draft.color, allowedParentTypeIds: parents, parentRequired: isRequired, isDefault: draft.isDefault });
      await refreshWorkItemTypes(client, workspaceId);
      setDraft(null); setChecked(false);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'WORK_ITEM_TYPE_NAME_CONFLICT') setTakenName(name);
      else setError(authError(failure));
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || isBusy) return;
    setBusy(true); setDeleteError(null);
    try { await deleteWorkItemType(workspaceId, deleting.id, deleting.version); await refreshWorkItemTypes(client, workspaceId); setDeleting(null); }
    catch (failure) { setDeleteError(new Error(authError(failure))); }
    finally { setBusy(false); }
  };
  const toast = useToast();
  const reorder = useRowReorder(list.map(type => ({ id: type.id, name: type.name })), { word: '유형', object: '유형을', topic: '유형은' }, moving.ghost,
    async order => { await reorderWorkItemTypes(workspaceId, order.map(id => list.find(type => type.id === id)!)); await refreshWorkItemTypes(client, workspaceId); },
    failure => { toast({ body: authError(failure) }); void refreshWorkItemTypes(client, workspaceId); });
  const shown = reorder.order.flatMap(id => list.filter(type => type.id === id));
  const hasParents = !!draft && draft.parents.length > 0;
  return <VStack gap={8}>
    <SettingsHead title="업무 유형" description="작업마다 유형이 하나 있고, 유형마다 어느 업무 밑에 둘 수 있는지 정합니다." />
    {!types.data ? <QueryMessage pending={types.isPending} error={types.error} retry={() => { void types.refetch(); }} />
      : <SettingsCard title={`유형 ${list.length}개`} id="types-list"
        actions={canWrite ? <Button label="새 유형" variant="secondary" size="sm" icon={<NavIcon name="plus" />} onClick={() => open()} /> : undefined}>
        <div ref={reorder.list} className={moving.list} role="list" aria-label="유형 순서">{shown.map(type => <div key={type.id} role="listitem" className={`${moving.row} ${styles.labelRow}`} {...reorder.rowProps(type.id)}><SettingsRow lead={<span className={styles.labelLead}>
          {canWrite && <button type="button" className={moving.grip} {...reorder.gripProps({ id: type.id, name: type.name })}><NavIcon name="grip" /></button>}
          <TypeMark type={type} size="md" /></span>}
          label={<>{type.name}{type.isDefault && <span className={styles.system}>기본</span>}</>}
          description={ruleText(type, list)}>
          <span className={styles.rowActions}>
            <span className={styles.typeCount}>업무 {type.workItemCount.toLocaleString()}개</span>
            {canWrite && <SettingsAction label={`${type.name} 고치기`} tooltip="고치기" icon="edit" onClick={() => open(type)} />}
            {canWrite && !type.isDefault && type.workItemCount === 0 && <SettingsAction label={`${type.name} 삭제`} tooltip="삭제" icon="delete" tone="danger" onClick={() => setDeleting(type)} />}
          </span>
        </SettingsRow></div>)}</div>
        <span className={styles.spoken} id={reorder.hint}>끌거나 Alt와 위아래 화살표로 순서를 바꿉니다.</span><span className={styles.spoken} role="status" aria-live="polite">{reorder.said}</span>
      </SettingsCard>}
    <CompactDialog isOpen={!!draft} title={draft?.from ? '유형 고치기' : '새 유형'} width={520} isBusy={isBusy} onClose={close} onSubmit={() => { void save(); }}
      footer={<><Button label="취소" variant="ghost" onClick={close} isDisabled={isBusy} /><Button className={draft?.from ? undefined : 'bit-create-action'} type="submit" label={draft?.from ? '저장' : '유형 만들기'} variant="primary" isLoading={isBusy} /></>}>
      <TextInput label="이름" value={draft?.name ?? ''} onChange={value => set({ name: value })} isRequired hasAutoFocus isDisabled={isBusy} placeholder="예: 개선"
        status={nameError ? { type: 'error', message: nameError } : undefined} />
      <fieldset className={styles.colors}>
        <legend className={styles.colorsLegend}>아이콘</legend>
        {TYPE_ICONS.map(icon => <button key={icon.value} type="button" className={styles.iconChoice} style={{ color: draft?.color }} aria-label={icon.name} title={icon.name}
          aria-pressed={draft?.icon === icon.value} disabled={isBusy} onClick={() => set({ icon: icon.value })}><NavIcon name={icon.value} /></button>)}
      </fieldset>
      <fieldset className={styles.colors}>
        <legend className={styles.colorsLegend}>색</legend>
        {PALETTE.map(color => <button key={color.value} type="button" className={styles.colorChoice} style={{ background: color.value }} aria-label={color.name}
          aria-pressed={draft?.color === color.value} disabled={isBusy} onClick={() => set({ color: color.value })} />)}
      </fieldset>
      <fieldset className={styles.colors}>
        <legend className={styles.colorsLegend}>들어갈 수 있는 상위</legend>
        {/* Every type, itself among them when it is being changed (작업 under 작업); a new one is not there yet. */}
        {list.map(type => <button key={type.id} type="button" className={styles.parentChoice} aria-pressed={!!draft?.parents.includes(type.id)} disabled={isBusy}
          onClick={() => draft && set({ parents: draft.parents.includes(type.id) ? draft.parents.filter(id => id !== type.id) : [...draft.parents, type.id] })}>
          <TypeMark type={type} />{type.name}</button>)}
        <span className={styles.fieldHint}>{hasParents ? '고른 유형의 업무 밑에 하위로 둘 수 있습니다.' : '고르지 않으면 최상위 유형이 되어 다른 업무 밑에 둘 수 없습니다.'}</span>
      </fieldset>
      <Switch label="상위가 꼭 있어야 함" value={!!draft && draft.isRequired && hasParents && !draft.isDefault} onChange={isRequired => set({ isRequired })}
        description="켜면 이 유형의 업무는 고른 상위 밑에서만 만들 수 있습니다."
        isDisabled={isBusy || !hasParents || !!draft?.isDefault} disabledMessage={!hasParents ? '들어갈 수 있는 상위를 먼저 고르세요.' : '기본 유형은 상위 없이도 만들 수 있어야 합니다.'} />
      <Switch label="기본 유형" value={!!draft?.isDefault} onChange={isDefault => set({ isDefault })} description="유형을 고르지 않고 만든 작업이 이 유형이 됩니다."
        isDisabled={isBusy || !!draft?.from?.isDefault || (!!draft?.isRequired && hasParents)}
        disabledMessage={draft?.from?.isDefault ? '다른 유형을 기본으로 정하면 바뀝니다.' : '상위가 꼭 있어야 하는 유형은 기본이 될 수 없습니다.'} />
      <FormMessage message={error} />
    </CompactDialog>
    {deleting && <ConfirmDialog title={`'${deleting.name}' 유형을 삭제할까요?`} description="이 유형을 쓰는 업무는 없습니다. 다른 유형의 상위 목록에서도 빠집니다." confirmLabel="삭제" variant="destructive"
      isPending={isBusy} error={deleteError} onClose={() => { setDeleting(null); setDeleteError(null); }} onConfirm={() => { void remove(); }} />}
  </VStack>;
}
