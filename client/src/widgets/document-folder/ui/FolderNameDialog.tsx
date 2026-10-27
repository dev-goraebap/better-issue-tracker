import { useState } from 'react';
import { Button, Text, TextInput, VStack } from '@astryxdesign/core';
import { ColorPalette, CompactDialog, FormMessage, NavIcon } from '@/shared/ui';
import type { Folder } from '@/entities/document';

export type FolderDraft = { name: string; color: string | null };

/** A folder's name asked for: a new folder's, or a new name for one (from). Answers the name; a refusal is said in it. */
export function FolderNameDialog({ from, onSave, onClose }: {
  from?: Pick<Folder, 'name' | 'color'>; onSave: (draft: FolderDraft) => Promise<string | undefined>; onClose: () => void;
}) {
  const [name, setName] = useState(from?.name ?? '');
  const [color, setColor] = useState<string | null>(from?.color ?? null);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!name.trim() || isBusy) return;
    setBusy(true); setError('');
    const refused = await onSave({ name: name.trim(), color });
    setBusy(false);
    if (refused) setError(refused);
  };
  return <CompactDialog title={from ? '폴더 편집' : '새 폴더'} width={480} isBusy={isBusy} onClose={onClose} onSubmit={() => { void save(); }}
    footer={<><Button label="취소" variant="ghost" onClick={onClose} isDisabled={isBusy} /><Button type="submit" label={from ? '저장' : '폴더 만들기'} variant="primary" isLoading={isBusy} isDisabled={!name.trim()} /></>}>
    <TextInput label="이름" value={name} onChange={setName} isRequired hasAutoFocus isDisabled={isBusy} placeholder="예: 회의록"
      startIcon={<span style={{ color: color ?? 'var(--color-icon-secondary)' }}><NavIcon name="documents" /></span>} />
    <VStack gap={2}>
      <Text type="label">폴더 아이콘 색상</Text>
      <ColorPalette label="폴더 아이콘 색상" value={color} isDisabled={isBusy} onChange={setColor} onClear={() => setColor(null)} />
    </VStack>
    <FormMessage message={error} />
  </CompactDialog>;
}
