import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { LeaveGuard } from '@/features/inline-edit';
import { ConfirmDialog, MarkdownEditor, MarkdownView } from '@/shared/ui';
import { newId, now, type Manual, type ManualPageData } from '../model/manual';
import styles from './manuals.module.css';

export function ManualEditor({ manual, page, onSave, onClose }: { manual: Manual; page: ManualPageData; onSave: (manual: Manual) => Promise<boolean>; onClose: () => void }) {
  const [baseline] = useState(manual); const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState(page); const [source, setSource] = useState(false); const [preview, setPreview] = useState(false); const [discard, setDiscard] = useState(false);
  const [assets, setAssets] = useState(manual.assets); const [error, setError] = useState('');
  const dirty = draft.title !== page.title || draft.body !== page.body || draft.sectionId !== page.sectionId;
  const save = async () => { if (!draft.title.trim() || saving) return; setSaving(true); if (await onSave({ ...baseline, assets, pages: baseline.pages.map(item => item.id === draft.id ? { ...draft, title: draft.title.trim(), updatedAt: now() } : item) })) onClose(); setSaving(false); };
  return <div className={styles.editing}><LeaveGuard when={dirty} />
    <div className={styles.editBar}><span>{dirty ? '저장하지 않은 변경' : '페이지 편집'}</span><div><Button label="취소" variant="ghost" isDisabled={saving} onClick={() => dirty ? setDiscard(true) : onClose()} /><Button label="저장" isLoading={saving} isDisabled={saving || !draft.title.trim()} onClick={save} /></div></div>
    <div className={styles.editorInner}>
      <TextInput label="페이지 제목" value={draft.title} onChange={title => setDraft({ ...draft, title: title.slice(0, 160) })} />
      <label className={styles.selectLabel}>섹션<select value={draft.sectionId} onChange={event => setDraft({ ...draft, sectionId: event.target.value })}><option value="">최상위</option>{manual.sections.map(section => <option value={section.id} key={section.id}>{section.title}</option>)}</select></label>
      <div className={styles.editModes}><button type="button" aria-pressed={!source && !preview} onClick={() => { setSource(false); setPreview(false); }}>본문 편집</button><button type="button" aria-pressed={source && !preview} onClick={() => { setSource(true); setPreview(false); }}>Markdown</button><button type="button" aria-pressed={preview} onClick={() => setPreview(true)}>미리보기</button></div>
      <div className={styles.prose}>{preview ? <MarkdownView value={draft.body} attachmentUrl={id => assets[id] ?? ''} /> : source ? <textarea className={styles.source} aria-label="Markdown 원문" value={draft.body} onChange={event => setDraft({ ...draft, body: event.target.value })} />
        : <MarkdownEditor value={draft.body} onChange={body => setDraft({ ...draft, body })} label="매뉴얼 본문" minHeight="360px" attachmentUrl={id => assets[id] ?? ''} />}</div>
      <label className={styles.upload}>이미지 추가<input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => {
        const file = event.target.files?.[0]; if (!file) return;
        if (file.size > 20 * 1024 * 1024) { setError('이미지는 20MB까지 추가할 수 있습니다. 원본 그대로 저장합니다.'); return; }
        const reader = new FileReader(); reader.onload = () => { const id = newId(); setAssets({ ...assets, [id]: String(reader.result) }); setDraft(current => ({ ...current, body: `${current.body}\n\n![${file.name.replace(/[\[\]\\]/g, '')}](attachment:${id})` })); setError(''); }; reader.readAsDataURL(file);
      }} /></label>{error && <p role="alert">{error}</p>}
    </div>
    {discard && <ConfirmDialog title="편집을 취소할까요?" description="저장하지 않은 제목과 본문이 사라집니다." confirmLabel="변경 버리기" variant="destructive" onClose={() => setDiscard(false)} onConfirm={onClose} />}
  </div>;
}
