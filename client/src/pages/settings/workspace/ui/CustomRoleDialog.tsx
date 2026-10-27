import { useState } from 'react';
import { Button, CheckboxInput, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { CompactDialog, FormMessage } from '@/shared/ui';
import { refreshWorkspace, saveCustomRole, type CustomRole } from '@/entities/workspace';

export const ROLE_PERMISSIONS = [
  ['WRITE_WORK', '업무·일정 작성', '업무와 일정, 뷰를 만들고 고칩니다.'],
  ['WRITE_DOCUMENTS', '문서·폴더 작성', '공통·프로젝트 문서와 폴더를 만들고 편집합니다. 프로젝트 접근 범위는 유지됩니다.'],
  ['MANAGE_LABELS', '라벨 관리', '라벨을 만들고 고치며 순서를 정합니다.'],
  ['EDIT_SETTINGS', '설정 관리', '워크스페이스·프로젝트 설정과 워크플로를 관리합니다.'],
  ['MANAGE_MEMBERS', '구성원 관리', '자신이 가진 범위 안에서 초대와 역할 부여를 관리합니다.'],
] as const;

/** A custom role is an explicit set of capabilities; ownership is deliberately outside this editor. */
export function CustomRoleDialog({ workspaceId, role, allowed, onClose }: { workspaceId: string; role?: CustomRole; allowed: readonly string[]; onClose: () => void }) {
  const client = useQueryClient();
  const [name, setName] = useState(role?.name ?? '');
  const [permissions, setPermissions] = useState<string[]>(role?.permissions ?? ['READ']);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async () => {
    if (!name.trim() || isBusy) return;
    setBusy(true); setError('');
    try {
      await saveCustomRole(workspaceId, { name: name.trim(), permissions, expectedVersion: role?.version }, role?.id);
      await refreshWorkspace(client, workspaceId); onClose();
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  return <CompactDialog isOpen title={role ? '역할 고치기' : '역할 추가'} width={540} isBusy={isBusy} onClose={onClose} onSubmit={() => { void save(); }}
    footer={<><Button label="취소" variant="ghost" onClick={onClose} isDisabled={isBusy} /><Button type="submit" label={role ? '저장' : '역할 만들기'} className={role ? undefined : 'bit-create-action'} isLoading={isBusy} isDisabled={!name.trim()} /></>}>
    <TextInput label="역할 이름" value={name} onChange={setName} isRequired hasAutoFocus />
    <VStack gap={4}>
      <CheckboxInput label="보기" description="참여한 워크스페이스와 접근 가능한 프로젝트의 자료를 봅니다." value={true} isDisabled />
      {ROLE_PERMISSIONS.map(([permission, label, description]) => <CheckboxInput key={permission} label={label} description={description}
        value={permissions.includes(permission)} isDisabled={isBusy || !allowed.includes(permission)}
        onChange={checked => setPermissions(current => checked ? [...current, permission] : current.filter(value => value !== permission))} />)}
    </VStack>
    <FormMessage message={error} />
  </CompactDialog>;
}
