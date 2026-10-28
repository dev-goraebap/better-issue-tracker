import { useRef, useState, type ReactNode } from 'react';
import { useToast } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError, type components } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import { ConfirmDialog, DuePicker, EventTimePicker, NavIcon, PropertyPicker, RepeatPicker, repeatText } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { useMembers } from '@/entities/workspace';
import { TypeMark, typeOptions, workItemTypesQuery } from '@/entities/work-item-type';
import {
  eventFields, eventTimeOf, eventWhen, itemQuery, labelOptions, LabelTokens, moveItem, NO_REMINDER, NO_STATUS, peopleOptions, PersonCell,
  priorityOptions, PriorityMark, refreshItems, reminderOptions, reminderText, repeatBody, repeatItem, repeatOf, statusOptions, StatusBadge, setWorkspaceStatus, stopRepeating, updateItem, type WorkItem,
} from '@/entities/work-item';
import { refreshTimeline } from '../api/timeline';
import { WorkItemProject } from './WorkItemProject';
import styles from './detail.module.css';

type Patch = Omit<components['schemas']['UpdateWorkItem'], 'expectedVersion'>;

/**
 * Properties change directly beneath the title. Serialize writes so rapid multi-selection keeps every choice. A task's
 * type (D-104) changes here too; a type its parent or subtasks rule out is refused, and the toast says why. Whether it
 * is a task or an event does not change here (D-108).
 */
export function WorkItemProperties({ item, canWrite }: { item: WorkItem; canWrite: boolean }) {
  const { workspaceId: w, id } = item; const p = item.projectId ?? '';
  const client = useQueryClient(); const toast = useToast();
  const columns = useQuery({ ...columnsQuery(w, p), enabled: !!p }).data ?? [];
  const labels = useQuery(labelsQuery(w)).data ?? [];
  const types = useQuery(workItemTypesQuery(w)).data ?? [];
  const members = useMembers(w).items;
  const [preview, setPreview] = useState<Patch & { columnId?: string | null }>({});
  const queue = useRef(Promise.resolve()); const pending = useRef(0);
  const [stopping, setStopping] = useState(false);
  const enqueue = (change: (version: number) => Promise<unknown>, optimistic: typeof preview = {}) => {
    pending.current += 1;
    setPreview(previous => ({ ...previous, ...optimistic }));
    queue.current = queue.current.then(async () => {
      try {
        const latest = await client.fetchQuery({ ...itemQuery(w, p, id), staleTime: 0 });
        await change(latest.version);
      } catch (error) { toast({ body: authError(error) }); }
      finally {
        await Promise.allSettled([refreshItems(client, w, p), refreshTimeline(client, w, 'work_item', id)]);
        pending.current -= 1;
        if (!pending.current) setPreview({});
      }
    });
  };
  const patch = (fields: Patch) => enqueue(version => updateItem(w, p, id, { ...fields, expectedVersion: version }), fields);
  const shown = { ...item, ...preview };
  const isEvent = item.kind === 'event';
  const field = (label: string, icon: string, content: ReactNode) => <div className={styles.inspectorField} key={label}>
    <span><NavIcon name={icon} />{label}</span><div className={styles.propertyValue}>{content}</div>
  </div>;
  return <section className={styles.inspectorSection} aria-label="세부 정보">
    {/* A task stays a task and an event an event: they are made apart (만들기 ▾), so nothing here turns one into the other (D-108). */}
    {!isEvent && field('유형', 'tasks', canWrite
      ? <PropertyPicker label="유형" icon="tasks" options={typeOptions(types)} value={preview.typeId ?? item.type?.id} onChange={value => { if (value && value !== (preview.typeId ?? item.type?.id)) patch({ typeId: value as string }); }} />
      : item.type ? <span className={styles.typeValue}><TypeMark type={item.type} />{item.type.name}</span> : '없음')}
    {!isEvent && field('상태', 'status', canWrite
      ? <PropertyPicker label="상태" icon="status" options={p ? statusOptions(columns) : [
        { value: 'todo', label: '할 일', icon: <StatusBadge category="todo" isLabelHidden /> }, { value: 'doing', label: '진행 중', icon: <StatusBadge category="doing" isLabelHidden /> }, { value: 'done', label: '완료', icon: <StatusBadge category="done" isLabelHidden /> }, { value: NO_STATUS, label: '상태 없음' },
      ]} value={p ? shown.columnId ?? NO_STATUS : preview.columnId ?? item.columnCategory ?? NO_STATUS} onChange={value => {
        const columnId = value === NO_STATUS || value === undefined ? null : String(value);
        if (!p) { enqueue(version => setWorkspaceStatus(w, id, columnId, version), { columnId }); return; }
        enqueue(version => moveItem(w, p, id, { expectedVersion: version, targetColumnId: columnId }), { columnId });
      }} /> : item.columnCategory ? <StatusBadge category={item.columnCategory} name={columns.find(column => column.id === item.columnId)?.name} /> : '상태 없음')}
    {!isEvent && field('우선순위', 'priority', canWrite
      ? <PropertyPicker label="우선순위" icon="priority" options={priorityOptions} value={shown.priority ?? undefined} onChange={value => patch({ priority: value as WorkItem['priority'] ?? null })} />
      : item.priority ? <PriorityMark priority={item.priority} /> : '없음')}
    {field(isEvent ? '참석자' : '담당자', 'person', canWrite
      ? <PropertyPicker label={isEvent ? '참석자' : '담당자'} icon="person" options={peopleOptions(members)} value={preview.peopleIds ?? item.people.map(person => person.id)} isMultiple onChange={value => patch({ peopleIds: value as string[] ?? [] })} />
      : <PersonCell people={item.people} empty="미배정" />)}
    {field('프로젝트', 'folder', <WorkItemProject item={item} canWrite={canWrite} />)}
    {isEvent ? field('일시', 'calendar', canWrite
      ? <EventTimePicker value={eventTimeOf(shown)} onChange={time => patch(eventFields(time))} onCommit={time => patch(eventFields(time))} />
      : eventWhen(item) || '없음') : <>
      {field('시작일', 'calendar', canWrite ? <DuePicker label="시작일" asDate value={shown.startDate} onChange={value => patch({ startDate: value ?? null })} /> : item.startDate ? dateText(item.startDate) : '없음')}
      {field('기한', 'calendar', canWrite ? <DuePicker value={shown.dueDate} onChange={value => patch({ dueDate: value ?? null })} /> : item.dueDate ? dateText(item.dueDate) : '없음')}
    </>}
    {isEvent && !item.allDay && field('알림', 'bell', canWrite
      ? <PropertyPicker label="알림" icon="bell" options={reminderOptions} value={shown.reminderMinutes == null ? NO_REMINDER : String(shown.reminderMinutes)} onChange={value => patch({ reminderMinutes: !value || value === NO_REMINDER ? null : Number(value) })} />
      : item.reminderMinutes == null ? '없음' : reminderText(item.reminderMinutes))}
    {field('라벨', 'label', canWrite
      ? <PropertyPicker label="라벨" icon="label" options={labelOptions(labels)} value={preview.labelIds ?? item.labels.map(label => label.id)} isMultiple onChange={value => patch({ labelIds: value as string[] ?? [] })} />
      : item.labels.length ? <LabelTokens labels={item.labels} /> : '없음')}
    {field('반복', 'repeat', !p ? <button type="button" title={item.recurrence ? '기존 반복을 끝냅니다. 새 반복은 프로젝트를 선택한 뒤 설정하세요.' : '프로젝트를 선택한 뒤 반복을 설정하세요.'} disabled={!canWrite || !item.recurrence} onClick={() => setStopping(true)}><NavIcon name="repeat" />{repeatText(repeatOf(item)) || '반복 없음'}</button> : canWrite
      ? <RepeatPicker value={repeatOf(item)} onChange={value => { if (value) enqueue(version => repeatItem(w, p, id, repeatBody(value, version))); }} onCommit={value => {
        if (!value && item.recurrence) { setStopping(true); return; }
        if (value) enqueue(version => repeatItem(w, p, id, repeatBody(value, version)));
      }} clearLabel={item.recurrence ? '반복 끝내기' : '반복 안 함'} />
      : repeatText(repeatOf(item)) || '없음')}
    {stopping && <ConfirmDialog title="반복을 끝낼까요?" description="이 회차 뒤의 회차를 지우고 반복을 끝냅니다. 이 회차는 남습니다." confirmLabel="반복 끝내기" variant="destructive" onClose={() => setStopping(false)} onConfirm={() => {
      enqueue(version => stopRepeating(w, p, id, version)); setStopping(false);
    }} />}
  </section>;
}
