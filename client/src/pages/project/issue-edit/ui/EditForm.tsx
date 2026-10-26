import { useId, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReturnTo } from '@/shared/lib/history-trail';
import { authError, type components } from '@/shared/api';
import { DuePicker, FormMessage, MarkdownEditor, PageFoot, PageFrame, PropertyPicker } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { useMembers } from '@/entities/workspace';
import {
  itemQuery, labelOptions, moveItem, NO_STATUS, peopleOptions, priorityOptions, refreshItems, statusOptions, updateItem, type Issue, type Priority,
} from '@/entities/issue';
import styles from './edit-form.module.css';

type Draft = {
  title: string; body: string; status: string; priority?: Priority; assigneeId?: string; startDate?: string; dueDate?: string; labelIds: string[];
};

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(each => b.includes(each));

/**
 * The edit page's form, drawn as 새 이슈's page (NewIssue): a borderless title and description, then the properties as a
 * row of pills under a hairline (상태, 우선순위, 담당자, 시작일, 기한, 라벨). The issue's detail only reads (BIT-22), so
 * this is where all of it changes. The draft is the member's until saved, whatever is read again meanwhile; 저장 (or
 * Ctrl + Enter) sends only what changed, over the version it opened with, so a save someone made since is a conflict
 * (409) said under the form, never overwritten. A new status is a move (its own request), made after the rest.
 */
export function EditForm({ item, back }: { item: Issue; back: ReactNode }) {
  const returnTo = useReturnTo();
  const client = useQueryClient();
  const formId = useId();
  const { workspaceId, projectId, id } = item;
  const columns = useQuery(columnsQuery(workspaceId, projectId)).data ?? [];
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const members = useMembers(workspaceId).items;
  const [opened] = useState<Draft>(() => ({
    title: item.title, body: item.description ?? '', status: item.columnId ?? NO_STATUS, priority: item.priority ?? undefined,
    assigneeId: item.assigneeId ?? undefined, startDate: item.startDate ?? undefined, dueDate: item.dueDate ?? undefined, labelIds: item.labels.map(label => label.id),
  }));
  const [draft, setDraft] = useState(opened);
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<Draft>) => setDraft(previous => ({ ...previous, ...patch }));
  const titleError = isChecked && !draft.title.trim() ? '제목을 입력해 주세요.' : '';
  // Back to the issue through history when it is the page before, so back from there does not return to the form.
  const leave = () => returnTo({ to: '/workspaces/$workspaceId/projects/$projectId/issues/$issueId', params: { workspaceId, projectId, issueId: id } });
  const save = async () => {
    setChecked(true);
    if (!draft.title.trim() || isBusy) return;
    setBusy(true); setError('');
    const changes: Omit<components['schemas']['UpdateIssue'], 'expectedVersion'> = {
      ...(draft.title.trim() !== opened.title ? { title: draft.title.trim() } : {}),
      ...(draft.body !== opened.body ? { description: draft.body.trim() || null } : {}),
      ...(draft.priority !== opened.priority ? { priority: draft.priority ?? null } : {}),
      ...(draft.assigneeId !== opened.assigneeId ? { assigneeId: draft.assigneeId ?? null } : {}),
      ...(draft.startDate !== opened.startDate ? { startDate: draft.startDate ?? null } : {}),
      ...(draft.dueDate !== opened.dueDate ? { dueDate: draft.dueDate ?? null } : {}),
      ...(!sameSet(draft.labelIds, opened.labelIds) ? { labelIds: draft.labelIds } : {}),
    };
    try {
      let version = item.version;
      if (Object.keys(changes).length > 0) {
        await updateItem(workspaceId, projectId, id, { expectedVersion: version, ...changes });
        if (draft.status !== opened.status) version = (await client.fetchQuery({ ...itemQuery(workspaceId, projectId, id), staleTime: 0 })).version;
      }
      if (draft.status !== opened.status) {
        await moveItem(workspaceId, projectId, id, { expectedVersion: version, targetColumnId: draft.status === NO_STATUS ? null : draft.status });
      }
      await refreshItems(client, workspaceId, projectId);
      leave();
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <PageFrame title={`${item.key} 편집`} width="narrow" back={back}>
    <form id={formId} className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <input className={styles.title} value={draft.title} placeholder="이슈 제목" aria-label="이슈 제목" required autoFocus disabled={isBusy}
        aria-invalid={titleError ? true : undefined} onChange={event => set({ title: event.target.value })} />
      {titleError && <FormMessage message={titleError} />}
      <MarkdownEditor value={draft.body} onChange={body => set({ body })} label="설명" minHeight="14rem" isDisabled={isBusy} onSubmit={() => { void save(); }}
        placeholder="설명을 덧붙이세요… ( / 로 블록)" />
      <div className={styles.pills} role="group" aria-label="속성">
        <PropertyPicker label="상태" icon="status" options={statusOptions(columns)} value={draft.status} onChange={value => set({ status: (value as string | undefined) ?? NO_STATUS })} />
        <PropertyPicker label="우선순위" icon="priority" options={priorityOptions} value={draft.priority} onChange={value => set({ priority: value as Priority | undefined })} />
        <PropertyPicker label="담당자" icon="person" options={peopleOptions(members)} value={draft.assigneeId} onChange={value => set({ assigneeId: value as string | undefined })} />
        <DuePicker label="시작일" asDate value={draft.startDate} onChange={startDate => set({ startDate })} />
        <DuePicker value={draft.dueDate} onChange={dueDate => set({ dueDate })} />
        <PropertyPicker label="라벨" icon="label" options={labelOptions(labels)} value={draft.labelIds} isMultiple onChange={value => set({ labelIds: (value as string[] | undefined) ?? [] })} />
      </div>
      <FormMessage message={error} />
    </form>
    <PageFoot start={<Button label="취소" variant="ghost" onClick={leave} isDisabled={isBusy} />}>
      <Button type="submit" form={formId} label="저장" variant="primary" isLoading={isBusy} />
    </PageFoot>
  </PageFrame>;
}
