import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { CompactDialog, FormMessage, IconPicker } from '@/shared/ui';
import { manualMark, newId, type Manual } from '../model/manual';

export function ManualDialog({ manual, scopeName, onSave, onClose }: { manual?: Manual; scopeName?: string; onSave: (manual: Manual) => Promise<boolean>; onClose: () => void }) {
  const [baseline] = useState(manual);
  const [title, setTitle] = useState(manual?.title ?? '');
  const [description, setDescription] = useState(manual?.description ?? '');
  const [mark, setMark] = useState(manualMark(manual));
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!title.trim() || saving) return; setSaving(true);
    if (await onSave({ ...(baseline ?? { id: newId(), cover: 'book', sections: [], pages: [], comments: [], assets: {} }), title: title.trim(), description: description.trim(), ...mark })) onClose();
    else setError('저장하지 못했습니다. 입력을 유지했습니다.');
    setSaving(false);
  };
  return <CompactDialog title={manual ? '매뉴얼 설정' : '매뉴얼 만들기'} subtitle={scopeName ? `소속: ${scopeName}` : undefined} onClose={() => { if (!saving) onClose(); }} onSubmit={save}
    footer={<><Button label="취소" variant="ghost" isDisabled={saving} onClick={onClose} /><Button type="submit" label={manual ? '저장' : '매뉴얼 만들기'} isLoading={saving} isDisabled={saving || !title.trim()} /></>}>
    <IconPicker label="매뉴얼 아이콘과 색 고르기" value={mark} onChange={setMark} />
    <TextInput label="매뉴얼 이름" value={title} onChange={value => setTitle(value.slice(0, 120))} hasAutoFocus placeholder="예: 프로젝트 개발 매뉴얼" />
    <TextInput label="설명" value={description} onChange={value => setDescription(value.slice(0, 400))} placeholder="누구를 위한 어떤 안내인지 적어 주세요" />
    <FormMessage message={error} />
  </CompactDialog>;
}
