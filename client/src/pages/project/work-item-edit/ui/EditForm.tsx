import { useId, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useReturnTo } from '@/shared/lib/history-trail';
import { authError, type components } from '@/shared/api';
import {
  CompactDialog, ConfirmDialog, DuePicker, EventTimePicker, FormMessage, MarkdownEditor, NavIcon, PageFoot, PageFrame, PropertyPicker, RepeatPicker, type EventTime,
  type Repeat,
} from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { useMembers } from '@/entities/workspace';
import {
  eventFields, eventTimeOf, itemQuery, labelOptions, moveItem, NO_STATUS, peopleOptions, priorityOptions, refreshItems, repeatBody, repeatItem, repeatOf,
  statusOptions, stopRepeating, updateItem, type WorkItem, type Priority,
} from '@/entities/work-item';
import styles from './edit-form.module.css';

type Draft = {
  title: string; body: string; kind: Kind; status: string; priority?: Priority; people: string[]; startDate?: string; dueDate?: string; labelIds: string[];
  time: EventTime; repeat?: Repeat;
};
type Kind = WorkItem['kind'];
type Scope = 'single' | 'following';

const KIND_OPTIONS = [
  { value: 'task', label: '작업', icon: <NavIcon name="board" /> },
  { value: 'event', label: '일정', icon: <NavIcon name="calendar" /> },
];
const sameTime = (a: EventTime, b: EventTime) => a.day === b.day && a.start === b.start && a.end === b.end && a.allDay === b.allDay;

const sameSet = (a: readonly string[], b: readonly string[]) => a.length === b.length && a.every(each => b.includes(each));
const sameRepeat = (a?: Repeat, b?: Repeat) => a === b || (!!a && !!b && a.frequency === b.frequency && a.interval === b.interval
  && sameSet(a.weekdays, b.weekdays) && a.untilOn === b.untilOn);

/**
 * The edit page's form, drawn as 새 업무's page (NewWorkItem): a borderless title and description, then the properties as a
 * row of pills under a hairline (상태, 우선순위, 담당자, 시작일, 기한, 라벨). The work item's detail only reads (BIT-22), so
 * this is where all of it changes. The draft is the member's until saved, whatever is read again meanwhile; 저장 (or
 * Ctrl + Enter) sends only what changed, over the version it opened with, so a save someone made since is a conflict
 * (409) said under the form, never overwritten. A new status is a move (its own request), made after the rest.
 * A repeating work item (D-092) asks whether the change is for this occurrence or this and the later ones; a new rule
 * starts from this occurrence, and 반복 끝내기 deletes the later occurrences after asking.
 */
export function EditForm({ item, back }: { item: WorkItem; back: ReactNode }) {
  const returnTo = useReturnTo();
  const client = useQueryClient();
  const formId = useId();
  const { workspaceId, projectId, id } = item;
  const columns = useQuery(columnsQuery(workspaceId, projectId)).data ?? [];
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const members = useMembers(workspaceId).items;
  const [opened] = useState<Draft>(() => ({
    title: item.title, body: item.description ?? '', kind: item.kind, status: item.columnId ?? NO_STATUS, priority: item.priority ?? undefined,
    people: item.people.map(person => person.id), startDate: item.startDate ?? undefined, dueDate: item.dueDate ?? undefined,
    labelIds: item.labels.map(label => label.id), time: eventTimeOf(item), repeat: repeatOf(item),
  }));
  const [draft, setDraft] = useState(opened);
  const isEvent = draft.kind === 'event';
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [asking, setAsking] = useState<{ question: 'scope' | 'stop'; scope?: Scope }>();
  const set = (patch: Partial<Draft>) => setDraft(previous => ({ ...previous, ...patch }));
  const titleError = isChecked && !draft.title.trim() ? '제목을 입력해 주세요.' : '';
  // Back to the work item through history when it is the page before, so back from there does not return to the form.
  const leave = () => returnTo({ to: '/workspaces/$workspaceId/projects/$projectId/work-items/$workItemId', params: { workspaceId, projectId, workItemId: id } });
  const save = async (scope?: Scope, isStopConfirmed = false) => {
    setChecked(true);
    if (!draft.title.trim() || isBusy) return;
    const changes: Omit<components['schemas']['UpdateWorkItem'], 'expectedVersion'> = {
      ...(draft.title.trim() !== opened.title ? { title: draft.title.trim() } : {}),
      ...(draft.body !== opened.body ? { description: draft.body.trim() || null } : {}),
      ...(draft.priority !== opened.priority ? { priority: draft.priority ?? null } : {}),
      ...(draft.kind !== opened.kind ? { kind: draft.kind } : {}),
      ...(!sameSet(draft.people, opened.people) ? { peopleIds: draft.people } : {}),
      // An event sends its time whole, as the kind takes it (D-092); a task its days.
      ...(isEvent && (draft.kind !== opened.kind || !sameTime(draft.time, opened.time)) ? eventFields(draft.time) : {}),
      ...(!isEvent && draft.startDate !== opened.startDate ? { startDate: draft.startDate ?? null } : {}),
      ...(!isEvent && draft.dueDate !== opened.dueDate ? { dueDate: draft.dueDate ?? null } : {}),
      ...(!sameSet(draft.labelIds, opened.labelIds) ? { labelIds: draft.labelIds } : {}),
    };
    const hasChanges = Object.keys(changes).length > 0;
    const isRepeatChanged = !sameRepeat(draft.repeat, opened.repeat);
    if (hasChanges && item.recurrence && !scope) { setAsking({ question: 'scope' }); return; }
    if (isRepeatChanged && !draft.repeat && item.recurrence && !isStopConfirmed) { setAsking({ question: 'stop', scope }); return; }
    setAsking(undefined);
    setBusy(true); setError('');
    const latest = async () => (await client.fetchQuery({ ...itemQuery(workspaceId, projectId, id), staleTime: 0 })).version;
    try {
      let version = item.version;
      if (hasChanges) {
        await updateItem(workspaceId, projectId, id, { expectedVersion: version, ...changes }, scope);
        if (isRepeatChanged || (!isEvent && draft.status !== opened.status)) version = await latest();
      }
      if (isRepeatChanged) {
        if (draft.repeat) await repeatItem(workspaceId, projectId, id, repeatBody(draft.repeat, version));
        else await stopRepeating(workspaceId, projectId, id, version);
        if (!isEvent && draft.status !== opened.status) version = await latest();
      }
      if (!isEvent && draft.status !== opened.status) {
        await moveItem(workspaceId, projectId, id, { expectedVersion: version, targetColumnId: draft.status === NO_STATUS ? null : draft.status });
      }
      await refreshItems(client, workspaceId, projectId);
      leave();
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <PageFrame title={`${item.key} 편집`} width="narrow" back={back}>
    <form id={formId} className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <input className={styles.title} value={draft.title} placeholder="업무 제목" aria-label="업무 제목" required autoFocus disabled={isBusy}
        aria-invalid={titleError ? true : undefined} onChange={event => set({ title: event.target.value })} />
      {titleError && <FormMessage message={titleError} />}
      <MarkdownEditor value={draft.body} onChange={body => set({ body })} label="설명" minHeight="14rem" isDisabled={isBusy} onSubmit={() => { void save(); }}
        placeholder="설명을 덧붙이세요… ( / 로 블록)" />
      <div className={styles.pills} role="group" aria-label="속성">
        <PropertyPicker label="종류" icon="board" options={KIND_OPTIONS} value={draft.kind} onChange={value => set({ kind: (value as Kind | undefined) ?? draft.kind })} />
        {!isEvent && <PropertyPicker label="상태" icon="status" options={statusOptions(columns)} value={draft.status} onChange={value => set({ status: (value as string | undefined) ?? NO_STATUS })} />}
        {!isEvent && <PropertyPicker label="우선순위" icon="priority" options={priorityOptions} value={draft.priority} onChange={value => set({ priority: value as Priority | undefined })} />}
        <PropertyPicker label={isEvent ? '참석자' : '담당자'} icon="person" options={peopleOptions(members)} value={draft.people} isMultiple
          onChange={value => set({ people: (value as string[] | undefined) ?? [] })} />
        {isEvent && <EventTimePicker value={draft.time} onChange={time => set({ time })} />}
        {!isEvent && <DuePicker label="시작일" asDate value={draft.startDate} onChange={startDate => set({ startDate })} />}
        {!isEvent && <DuePicker value={draft.dueDate} onChange={dueDate => set({ dueDate })} />}
        <PropertyPicker label="라벨" icon="label" options={labelOptions(labels)} value={draft.labelIds} isMultiple onChange={value => set({ labelIds: (value as string[] | undefined) ?? [] })} />
        <RepeatPicker value={draft.repeat} onChange={repeat => set({ repeat })} clearLabel={item.recurrence ? '반복 끝내기' : '반복 안 함'} />
      </div>
      <FormMessage message={error} />
    </form>
    {asking?.question === 'scope' && <CompactDialog title="반복 업무 고치기" width={520} onClose={() => setAsking(undefined)} footer={<>
      <Button label="취소" variant="ghost" onClick={() => setAsking(undefined)} />
      <Button label="이 회차만" variant="secondary" onClick={() => { void save('single'); }} />
      <Button label="이후 모두" variant="primary" onClick={() => { void save('following'); }} />
    </>}>
      <p className={styles.question}>이 회차만 고칠까요, 이후 회차도 함께 고칠까요? 이후 모두를 고르면 설명은 다음에 만들어질 회차부터 바뀝니다.</p>
    </CompactDialog>}
    {asking?.question === 'stop' && <ConfirmDialog title="반복을 끝낼까요?" description="이 회차 뒤에 만들어진 회차를 지우고, 더는 만들지 않습니다. 이 회차는 남습니다."
      confirmLabel="반복 끝내기" variant="destructive" onClose={() => setAsking(undefined)} onConfirm={() => { void save(asking.scope, true); }} />}
    <PageFoot start={<Button label="취소" variant="ghost" onClick={leave} isDisabled={isBusy} />}>
      <Button type="submit" form={formId} label="저장" variant="primary" isLoading={isBusy} />
    </PageFoot>
  </PageFrame>;
}
