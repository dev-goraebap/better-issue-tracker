import { useId, useState, type ReactNode } from 'react';
import { Button, TextArea, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { FormMessage, PageFoot, PageFrame } from '@/shared/ui';
import { refreshItems, updateItem, type WorkItem } from '@/entities/work-item';

/** The edit page's form over one version of the issue: a newer version (after a save elsewhere) starts it afresh. */
export function EditForm({ item, back }: { item: WorkItem; back: ReactNode }) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const formId = useId();
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.description ?? '');
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleError = isChecked && !title.trim() ? '제목을 입력해 주세요.' : undefined;
  const leave = () => void navigate({ to: '/w/$workspaceId/p/$projectId/work-items/$workItemId', params: { workspaceId: item.workspaceId, projectId: item.projectId, workItemId: item.id } });
  const save = async () => {
    setChecked(true);
    if (!title.trim() || isBusy) return;
    setBusy(true); setError('');
    try {
      await updateItem(item.workspaceId, item.projectId, item.id, { expectedVersion: item.version, title: title.trim(), description: body.trim() || null });
      await refreshItems(client, item.workspaceId, item.projectId);
      leave();
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <PageFrame title={`${item.key} 편집`} width="narrow" back={back}>
    <form id={formId} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <VStack gap={5}>
        <TextInput label="제목" value={title} onChange={setTitle} isRequired hasAutoFocus isDisabled={isBusy} placeholder="무엇을 해야 하나요?"
          status={titleError ? { type: 'error', message: titleError } : undefined} />
        <TextArea label="설명" value={body} onChange={setBody} rows={10} isOptional isDisabled={isBusy} placeholder="배경과 완료 기준을 적어 주세요." />
        <FormMessage message={error} />
      </VStack>
    </form>
    <PageFoot start={<Button label="취소" variant="ghost" onClick={leave} isDisabled={isBusy} />}>
      <Button type="submit" form={formId} label="저장" variant="primary" isLoading={isBusy} />
    </PageFoot>
  </PageFrame>;
}
