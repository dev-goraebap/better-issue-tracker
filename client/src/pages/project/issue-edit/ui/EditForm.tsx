import { useId, useState, type ReactNode } from 'react';
import { Button, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useReturnTo } from '@/shared/lib/history-trail';
import { authError } from '@/shared/api';
import { FormMessage, MarkdownEditor, PageFoot, PageFrame } from '@/shared/ui';
import { refreshItems, updateItem, type Issue } from '@/entities/issue';
import styles from './edit-form.module.css';

/**
 * The edit page's form: the draft is the member's until saved, whatever is read again meanwhile, and it saves over the
 * version it opened with (the description in the Markdown editor, D-076; Ctrl + Enter saves from it), so a save someone made since is a conflict (409) said under the form, never overwritten.
 */
export function EditForm({ item, back }: { item: Issue; back: ReactNode }) {
  const returnTo = useReturnTo();
  const client = useQueryClient();
  const formId = useId();
  const [openedVersion] = useState(item.version);
  const [title, setTitle] = useState(item.title);
  const [body, setBody] = useState(item.description ?? '');
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleError = isChecked && !title.trim() ? '제목을 입력해 주세요.' : undefined;
  // Back to the issue through history when it is the page before, so back from there does not return to the form.
  const leave = () => returnTo({ to: '/workspaces/$workspaceId/projects/$projectId/issues/$issueId', params: { workspaceId: item.workspaceId, projectId: item.projectId, issueId: item.id } });
  const save = async () => {
    setChecked(true);
    if (!title.trim() || isBusy) return;
    setBusy(true); setError('');
    try {
      await updateItem(item.workspaceId, item.projectId, item.id, { expectedVersion: openedVersion, title: title.trim(), description: body.trim() || null });
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
        <div className={styles.field}>
          <span className={styles.label} aria-hidden="true">설명</span>
          <MarkdownEditor value={body} onChange={setBody} label="설명" variant="field" minHeight="14rem" isDisabled={isBusy} onSubmit={() => { void save(); }}
            placeholder="배경과 완료 기준을 적어 주세요. ( / 로 블록)" />
        </div>
        <FormMessage message={error} />
      </VStack>
    </form>
    <PageFoot start={<Button label="취소" variant="ghost" onClick={leave} isDisabled={isBusy} />}>
      <Button type="submit" form={formId} label="저장" variant="primary" isLoading={isBusy} />
    </PageFoot>
  </PageFrame>;
}
