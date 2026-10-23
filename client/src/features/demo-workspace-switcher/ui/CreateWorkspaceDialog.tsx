import { useState } from 'react';
import { Button, TextArea, TextInput } from '@astryxdesign/core';
import { CompactDialog } from '@/shared/ui';
import { addWorkspace } from '@/entities/demo-sample';
import { LogoField } from './LogoField';

/**
 * A new workspace (짧은 창): its logo, name and an optional description; the member owns it and lands on its home.
 * The name is required and checked on submit; the draft lives here until made. In the demo it is kept in memory; the
 * real one is made through the server, the logo stored by the file adapter (D-030).
 */
export function CreateWorkspaceDialog({ isOpen, onClose, onCreated }: { isOpen: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logo, setLogo] = useState<string | undefined>();
  const [isChecked, setChecked] = useState(false);
  const nameError = isChecked && !name.trim() ? '워크스페이스 이름을 입력해 주세요.' : undefined;
  const reset = () => { setName(''); setDescription(''); setLogo(undefined); setChecked(false); };
  const close = () => { reset(); onClose(); };
  const submit = () => {
    setChecked(true);
    if (!name.trim()) return;
    const id = addWorkspace({ name: name.trim(), description: description.trim() || undefined, logo });
    reset(); onCreated(id);
  };
  return <CompactDialog isOpen={isOpen} title="새 워크스페이스" subtitle="팀이나 제품 하나에 워크스페이스 하나를 둡니다." width={480} onClose={close} onSubmit={submit}
    footer={<><Button label="취소" variant="ghost" onClick={close} /><Button type="submit" label="워크스페이스 만들기" variant="primary" /></>}>
    <LogoField name={name} value={logo} onChange={setLogo} />
    <TextInput label="이름" value={name} onChange={setName} isRequired hasAutoFocus placeholder="예: BIT 개발" status={nameError ? { type: 'error', message: nameError } : undefined} />
    <TextArea label="설명" value={description} onChange={setDescription} isOptional rows={2} placeholder="무엇을 하는 공간인지 한 줄로 적어 주세요." />
  </CompactDialog>;
}
