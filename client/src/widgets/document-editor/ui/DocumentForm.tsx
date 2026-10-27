import { useId, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { FormMessage, MarkdownEditor, NavIcon, PageFoot, PageFrame, PropertyPicker } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { labelOptions } from '@/entities/work-item';
import styles from './document-form.module.css';

export type DocumentDraft = { title: string; body: string; labelIds: string[] };

/**
 * A document written on its own page (D-093, BIT-41), new or opened to edit, drawn as a work item's: a borderless title,
 * the body in the Markdown editor (D-076, / for blocks), then where it goes and its labels as pills. 저장 (or Ctrl +
 * Enter) answers the draft to onSave, whose refusal (a change someone saved first, 409) is said under the form.
 */
export function DocumentForm({ workspaceId, title, back, place, initial, saveLabel, onSave, onCancel }: {
  workspaceId: string; title: string; back: ReactNode; place: string; initial: DocumentDraft; saveLabel: string;
  onSave: (draft: DocumentDraft) => Promise<string | undefined>; onCancel: () => void;
}) {
  const formId = useId();
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const [draft, setDraft] = useState(initial);
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const titleError = isChecked && !draft.title.trim() ? '제목을 입력해 주세요.' : '';
  const save = async () => {
    setChecked(true);
    if (!draft.title.trim() || isBusy) return;
    setBusy(true); setError('');
    const refused = await onSave({ ...draft, title: draft.title.trim() });
    setBusy(false);
    if (refused) setError(refused);
  };
  return <PageFrame title={title} width="narrow" back={back}>
    <form id={formId} className={styles.form} noValidate onSubmit={event => { event.preventDefault(); void save(); }}>
      <input className={styles.title} value={draft.title} placeholder="문서 제목" aria-label="문서 제목" required autoFocus disabled={isBusy}
        aria-invalid={titleError ? true : undefined} onChange={event => setDraft({ ...draft, title: event.target.value })} />
      {titleError && <FormMessage message={titleError} />}
      <MarkdownEditor value={draft.body} onChange={body => setDraft(previous => ({ ...previous, body }))} label="본문" minHeight="20rem" isDisabled={isBusy}
        onSubmit={() => { void save(); }} placeholder="쓰기 시작하세요… ( / 로 블록)" />
      <div className={styles.pills} role="group" aria-label="속성">
        <span className={styles.place}><NavIcon name="documents" />{place}</span>
        <PropertyPicker label="라벨" icon="label" options={labelOptions(labels)} value={draft.labelIds} isMultiple
          onChange={value => setDraft({ ...draft, labelIds: (value as string[] | undefined) ?? [] })} />
      </div>
      <FormMessage message={error} />
    </form>
    <PageFoot start={<Button label="취소" variant="ghost" onClick={onCancel} isDisabled={isBusy} />}>
      <Button type="submit" form={formId} label={saveLabel} variant="primary" isLoading={isBusy} />
    </PageFoot>
  </PageFrame>;
}
