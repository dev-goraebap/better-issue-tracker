import { useId, useState } from 'react';
import { Button, TextArea, TextInput, VStack } from '@astryxdesign/core';
import { useNavigate, useParams } from '@tanstack/react-router';
import { BackLink, DateField, PageFoot, PageFrame, Select } from '@/shared/ui';
import { demoStyles, PEOPLE, type Priority, PRIORITY_LABELS, type Status, STATUS_LABELS } from '@/entities/demo-sample';

const statusOptions = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));
const priorityOptions = Object.entries(PRIORITY_LABELS).map(([value, label]) => ({ value, label }));
const peopleOptions = PEOPLE.map(person => ({ value: person.id, label: person.name }));

/**
 * PATTERN · 작성 양식, /demo/w/$workspaceId/p/$projectId/work-items/new. Copy this page for creating or editing one item on its own address (not in a dialog).
 *
 * - PageFrame width="narrow" with back: a phone gives the form the whole screen, no tab bar.
 * - The foot row is PageFoot: 취소 at its start, the submit at its end. The shell draws it at the card's bottom, outside
 *   the <form>, so the submit button points at the form by id (form={formId}).
 * - Fields use the platform's own: TextInput/TextArea, Select (a bottom sheet on a phone), DateField. Errors appear on
 *   submit, on the field that has them; the draft stays in local state until saved.
 * - The route sets staticData form in a real app so a phone keeps the action row above the keyboard.
 */
export function DemoFormPage() {
  const { workspaceId, projectId } = useParams({ from: '/demo/w/$workspaceId/p/$projectId/work-items/new' });
  const navigate = useNavigate();
  const formId = useId();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<Status>('todo');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignee, setAssignee] = useState<string | undefined>('u1');
  const [due, setDue] = useState<string | undefined>();
  const [isChecked, setChecked] = useState(false);
  const titleError = isChecked && !title.trim() ? '제목을 입력해 주세요.' : undefined;
  const leave = () => void navigate({ to: '/demo/w/$workspaceId/work', params: { workspaceId }, search: { project: projectId } });
  return <PageFrame title="새 작업" width="narrow" back={<BackLink to="/demo/w/$workspaceId/work" params={{ workspaceId }} search={{ project: projectId }} label="작업" />}>
    <form id={formId} noValidate onSubmit={event => { event.preventDefault(); setChecked(true); if (title.trim()) leave(); }}>
      <VStack gap={5}>
        <TextInput label="제목" value={title} onChange={setTitle} isRequired hasAutoFocus placeholder="무엇을 해야 하나요?"
          status={titleError ? { type: 'error', message: titleError } : undefined} />
        <TextArea label="설명" value={body} onChange={setBody} rows={6} isOptional placeholder="배경과 완료 기준을 적어 주세요. 마크다운을 쓸 수 있습니다." />
        <div className={demoStyles.fieldGrid}>
          <Select label="상태" options={statusOptions} value={status} onChange={value => setStatus(value as Status)} />
          <Select label="우선순위" options={priorityOptions} value={priority} onChange={value => setPriority(value as Priority)} />
          <Select label="담당자" options={peopleOptions} value={assignee} onChange={value => setAssignee(value ?? undefined)} isOptional />
          <DateField label="기한" value={due} onChange={setDue} isOptional hasClear />
        </div>
      </VStack>
    </form>
    <PageFoot start={<Button label="취소" variant="ghost" onClick={leave} />}>
      <Button type="submit" form={formId} label="작업 만들기" variant="primary" />
    </PageFoot>
  </PageFrame>;
}
