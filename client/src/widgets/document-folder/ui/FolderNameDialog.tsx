import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { CompactDialog, FormMessage } from '@/shared/ui';

/** A folder's name asked for: a new folder's, or a new name for one (from). Answers the name; a refusal is said in it. */
export function FolderNameDialog({ from, onSave, onClose }: {
  from?: string; onSave: (name: string) => Promise<string | undefined>; onClose: () => void;
}) {
  const [name, setName] = useState(from ?? '');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!name.trim() || isBusy) return;
    setBusy(true); setError('');
    const refused = await onSave(name.trim());
    setBusy(false);
    if (refused) setError(refused);
  };
  return <CompactDialog title={from ? '폴더 이름 바꾸기' : '새 폴더'} width={480} isBusy={isBusy} onClose={onClose} onSubmit={() => { void save(); }}
    footer={<><Button label="취소" variant="ghost" onClick={onClose} isDisabled={isBusy} /><Button type="submit" label={from ? '저장' : '폴더 만들기'} variant="primary" isLoading={isBusy} isDisabled={!name.trim()} /></>}>
    <TextInput label="이름" value={name} onChange={setName} isRequired hasAutoFocus isDisabled={isBusy} placeholder="예: 회의록" />
    <FormMessage message={error} />
  </CompactDialog>;
}
