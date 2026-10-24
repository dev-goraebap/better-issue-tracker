import { useState } from 'react';
import { Button, Switch, TextInput, TimeInput } from '@astryxdesign/core';
import type { ISOTimeString } from '@astryxdesign/core/TimeInput';
import { CompactDialog, DateField, Select } from '@/shared/ui';
import { addSchedule, type Project } from '@/entities/demo-sample';
import styles from './schedule.module.css';

const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + 86_400_000).toISOString().slice(0, 10);

/**
 * A new schedule of the workspace (짧은 창): its title, the project it is for (or none), its day, and its hours unless
 * it takes the whole day. It opens on the day the calendar shows, ten to eleven; the title is required and an end
 * after its start, both checked on submit. onCreated hands back its day so the calendar can go there.
 */
export function ScheduleDialog({ isOpen, workspaceId, projects, project, day, onClose, onCreated }: {
  isOpen: boolean; workspaceId: string; projects: readonly Project[];
  /** The project in scope, chosen to begin with. */
  project?: string; day: string; onClose: () => void; onCreated: (day: string) => void;
}) {
  const [title, setTitle] = useState('');
  const [projectId, setProjectId] = useState<string | undefined>(project);
  const [date, setDate] = useState<string | undefined>(day);
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState('10:00');
  const [end, setEnd] = useState('11:00');
  const [isChecked, setChecked] = useState(false);
  const titleError = isChecked && !title.trim() ? '일정 이름을 입력해 주세요.' : undefined;
  const dateError = isChecked && !date ? '날짜를 골라 주세요.' : undefined;
  const timeError = isChecked && !allDay && end <= start ? '끝나는 시각은 시작 뒤여야 합니다.' : undefined;
  const reset = () => { setTitle(''); setProjectId(project); setDate(day); setAllDay(false); setStart('10:00'); setEnd('11:00'); setChecked(false); };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    setChecked(true);
    if (!title.trim() || !date || (!allDay && end <= start)) return;
    addSchedule({ workspaceId, projectId, title: title.trim(), allDay,
      start: allDay ? `${date}T00:00:00` : `${date}T${start}:00`, end: allDay ? `${nextDay(date)}T00:00:00` : `${date}T${end}:00` });
    reset(); onCreated(date);
  };
  return <CompactDialog isOpen={isOpen} title="새 일정" width={480} onClose={close} onSubmit={submit}
    footer={<><Button label="취소" variant="ghost" onClick={close} /><Button type="submit" label="일정 만들기" variant="primary" /></>}>
    <TextInput label="이름" value={title} onChange={setTitle} isRequired hasAutoFocus placeholder="예: 스프린트 리뷰" status={titleError ? { type: 'error', message: titleError } : undefined} />
    <Select label="프로젝트" options={projects.map(project => ({ value: project.id, label: project.name }))} value={projectId}
      onChange={value => setProjectId(value ?? undefined)} isOptional placeholder="프로젝트 없음" />
    <DateField label="날짜" value={date} onChange={setDate} isRequired status={dateError ? { type: 'error', message: dateError } : undefined} />
    <Switch label="종일" value={allDay} onChange={setAllDay} />
    {!allDay && <div className={styles.times}>
      <TimeInput label="시작" value={start as ISOTimeString} onChange={value => value && setStart(value.slice(0, 5))} />
      <TimeInput label="끝" value={end as ISOTimeString} onChange={value => value && setEnd(value.slice(0, 5))}
        status={timeError ? { type: 'error', message: timeError } : undefined} />
    </div>}
  </CompactDialog>;
}
