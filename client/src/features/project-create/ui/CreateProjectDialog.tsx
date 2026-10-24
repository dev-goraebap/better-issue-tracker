import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { ApiError, authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
import { createProject, refreshProjects } from '@/entities/project';

const KEY = /^[A-Z0-9]{2,10}$/;
/** A key offered from the name: its Latin letters and digits, upper case, up to four; else nothing to offer. */
const keyFrom = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

/**
 * A new project (짧은 창): its name and key, both required and checked on submit (a key is 2–10 Latin capitals and
 * digits, not one the workspace has had), the key offered from the name until typed. A taken key is said on the key's
 * field. The member lands on the new project's page.
 */
export function CreateProjectDialog({ workspaceId, isOpen, onClose, onCreated }: { workspaceId: string; isOpen: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const client = useQueryClient();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [isKeyTyped, setKeyTyped] = useState(false);
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [takenKey, setTakenKey] = useState('');
  const [error, setError] = useState('');
  const shownKey = isKeyTyped ? key : keyFrom(name);
  const nameError = isChecked && !name.trim() ? '프로젝트 이름을 입력해 주세요.' : undefined;
  const keyError = !isChecked ? undefined : !shownKey ? '프로젝트 키를 입력해 주세요.' : !KEY.test(shownKey) ? '영문 대문자·숫자 2~10자로 적어 주세요.'
    : shownKey === takenKey ? '이 워크스페이스에서 이미 쓴 키입니다.' : undefined;
  const reset = () => { setName(''); setKey(''); setKeyTyped(false); setChecked(false); setTakenKey(''); setError(''); };
  const close = () => { if (isBusy) return; reset(); onClose(); };
  const submit = async () => {
    setChecked(true);
    if (!name.trim() || !KEY.test(shownKey) || shownKey === takenKey || isBusy) return;
    setBusy(true); setError('');
    try {
      const id = await createProject(workspaceId, { name: name.trim(), key: shownKey });
      await refreshProjects(client, workspaceId);
      reset(); onCreated(id);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'PROJECT_KEY_CONFLICT') setTakenKey(shownKey);
      else setError(authError(failure));
    } finally { setBusy(false); }
  };
  return <CompactDialog isOpen={isOpen} title="새 프로젝트" width={440} isBusy={isBusy} onClose={close} onSubmit={() => { void submit(); }}
    footer={<><Button label="취소" variant="ghost" onClick={close} isDisabled={isBusy} /><Button type="submit" label="프로젝트 만들기" variant="primary" isLoading={isBusy} /></>}>
    <TextInput label="이름" value={name} onChange={setName} isRequired hasAutoFocus isDisabled={isBusy} placeholder="예: 모바일 앱"
      status={nameError ? { type: 'error', message: nameError } : undefined} />
    <TextInput label="키" value={shownKey} onChange={value => { setKeyTyped(true); setKey(value.toUpperCase()); }} isRequired isDisabled={isBusy} placeholder="예: APP"
      description={`이슈 번호가 ${shownKey || 'APP'}-1처럼 붙습니다.`} status={keyError ? { type: 'error', message: keyError } : undefined} />
    <FormMessage message={error} />
  </CompactDialog>;
}
