import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
import { createWorkspace, selectWorkspace } from '@/entities/workspace';

/** The workspace's fixed address from its name: its Latin letters and digits joined by hyphens, else a short random one. */
const slugFrom = (name: string, isRandom = false) => {
  const latin = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const random = Math.random().toString(36).slice(2, 8);
  if (latin.length >= 2 && !isRandom) return latin;
  return `${latin.length >= 2 ? latin : 'ws'}-${random}`;
};

/**
 * A new workspace (짧은 창): its name, required and checked on submit; the member owns it and lands on its home. Its
 * fixed address (slug) comes from the name and is never asked for: a taken one gets a short random end and is tried
 * once more.
 */
export function CreateWorkspaceDialog({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nameError = isChecked && !name.trim() ? '워크스페이스 이름을 입력해 주세요.' : undefined;
  const reset = () => { setName(''); setChecked(false); setError(''); };
  const close = () => { if (isBusy) return; reset(); onClose(); };
  const make = async (isRetry: boolean): Promise<string> => {
    try { return await createWorkspace(name.trim(), slugFrom(name, isRetry)); }
    catch (failure) {
      if (!isRetry && failure instanceof ApiError && failure.code === 'WORKSPACE_SLUG_CONFLICT') return make(true);
      throw failure;
    }
  };
  const submit = async () => {
    setChecked(true);
    if (!name.trim() || isBusy) return;
    setBusy(true); setError('');
    try {
      const id = await make(false);
      await selectWorkspace(id);
      await client.invalidateQueries({ queryKey: ['workspaces'] });
      reset(); onCreated(id);
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <CompactDialog isOpen={isOpen} title="새 워크스페이스" subtitle="팀이나 제품 하나에 워크스페이스 하나를 둡니다." width={480} isBusy={isBusy} onClose={close}
    onSubmit={() => { void submit(); }}
    footer={<><Button label="취소" variant="ghost" onClick={close} isDisabled={isBusy} /><Button type="submit" label="워크스페이스 만들기" variant="primary" isLoading={isBusy} /></>}>
    <TextInput label="이름" value={name} onChange={setName} isRequired hasAutoFocus isDisabled={isBusy} placeholder="예: BIT 개발"
      status={nameError ? { type: 'error', message: nameError } : undefined} />
    <FormMessage message={error} />
  </CompactDialog>;
}
