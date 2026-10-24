import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { CompactDialog } from '@/shared/ui';
import { addProject, ME, projectsIn } from '@/entities/demo-sample';

const KEY = /^[A-Z][A-Z0-9]{1,9}$/;
/** A key offered from the name: its Latin letters and digits, upper case, up to four; else nothing to offer. */
const keyFrom = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);

/**
 * A new project (짧은 창): its name and key, both required and checked on submit (a key is 2–10 Latin letters and
 * digits starting with a letter, not one the workspace has), offered from the name until typed. The member leads it and
 * lands on its page. In the demo it is kept in memory; the real one is made through the server.
 */
export function CreateProjectDialog({ workspaceId, isOpen, onClose, onCreated }: { workspaceId: string; isOpen: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [isKeyTyped, setKeyTyped] = useState(false);
  const [isChecked, setChecked] = useState(false);
  const shownKey = isKeyTyped ? key : keyFrom(name);
  const taken = projectsIn(workspaceId).some(project => project.key === shownKey);
  const nameError = isChecked && !name.trim() ? '프로젝트 이름을 입력해 주세요.' : undefined;
  const keyError = !isChecked ? undefined : !shownKey ? '프로젝트 키를 입력해 주세요.' : !KEY.test(shownKey) ? '영문 대문자로 시작하는 2~10자의 영문·숫자로 적어 주세요.' : taken ? '이미 쓰는 키입니다.' : undefined;
  const reset = () => { setName(''); setKey(''); setKeyTyped(false); setChecked(false); };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    setChecked(true);
    if (!name.trim() || !KEY.test(shownKey) || taken) return;
    const id = addProject({ workspaceId, name: name.trim(), key: shownKey, leadId: ME });
    reset(); onCreated(id);
  };
  return <CompactDialog isOpen={isOpen} title="새 프로젝트" width={440} onClose={close} onSubmit={submit}
    footer={<><Button label="취소" variant="ghost" onClick={close} /><Button type="submit" label="프로젝트 만들기" variant="primary" /></>}>
    <TextInput label="이름" value={name} onChange={setName} isRequired hasAutoFocus placeholder="예: 모바일 앱" status={nameError ? { type: 'error', message: nameError } : undefined} />
    <TextInput label="키" value={shownKey} onChange={value => { setKeyTyped(true); setKey(value.toUpperCase()); }} isRequired placeholder="예: APP"
      description={`작업 번호가 ${shownKey || 'APP'}-1처럼 붙습니다.`} status={keyError ? { type: 'error', message: keyError } : undefined} />
  </CompactDialog>;
}
