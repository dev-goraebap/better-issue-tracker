import { useState } from 'react';
import { Button, TextArea, TextInput, VStack } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { ApiError, authError } from '@/shared/api';
import { ConfirmDialog, FormMessage, MarkPicker, SettingsCard, SettingsHead, SettingsRow } from '@/shared/ui';
import { archiveProject, deleteProject, PROJECT_KEY as KEY, ProjectMark, refreshProjects, updateProject, type Project } from '@/entities/project';

/**
 * 일반: the project's mark (its icon and colour; one without a mark starts from the board icon in grey), name, key (a key
 * changed keeps the old one found, D-011) and description, saved together; then
 * 보관 (or 보관 해제) and 삭제 in the danger zone, deleting behind the project's key typed. Only the workspace's owner
 * and admins change them; the others read them.
 */
export function ProjectGeneralSettings({ project, canManage }: { project: Project; canManage: boolean }) {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [mark, setMark] = useState({ icon: project.icon ?? 'board', color: project.color ?? '#95959f' });
  const [name, setName] = useState(project.name);
  const [key, setKey] = useState(project.key);
  const [description, setDescription] = useState(project.description ?? '');
  const [isChecked, setChecked] = useState(false);
  const [takenKey, setTakenKey] = useState('');
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [asking, setAsking] = useState<'archive' | 'delete' | null>(null);
  const [askError, setAskError] = useState<Error | null>(null);
  const isArchived = !!project.archivedAt;
  const editable = canManage && !isArchived;
  const nameError = isChecked && !name.trim() ? '이름을 입력해 주세요.' : undefined;
  const keyError = !isChecked ? undefined : !KEY.test(key) ? '영문 대문자·숫자 2~10자로 적어 주세요.' : key === takenKey ? '이 워크스페이스에서 이미 쓴 키입니다.' : undefined;
  const isMarkChanged = mark.icon !== (project.icon ?? 'board') || mark.color !== (project.color ?? '#95959f');
  const isChanged = isMarkChanged || name.trim() !== project.name || key !== project.key || description.trim() !== (project.description ?? '');
  const save = async () => {
    setChecked(true);
    if (!name.trim() || !KEY.test(key) || key === takenKey || isBusy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await updateProject(project.workspaceId, project.id, { expectedVersion: project.version, name: name.trim(), key, description: description.trim() || null,
        ...(isMarkChanged ? { icon: mark.icon, color: mark.color } : {}) });
      setNotice('저장했습니다.'); setChecked(false);
      await refreshProjects(client, project.workspaceId);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'PROJECT_KEY_CONFLICT') setTakenKey(key);
      else setError(authError(failure));
    } finally { setBusy(false); }
  };
  const act = async () => {
    if (!asking || isBusy) return;
    setBusy(true); setAskError(null);
    try {
      if (asking === 'archive') await archiveProject(project.workspaceId, project.id, project.version, !isArchived);
      else await deleteProject(project.workspaceId, project.id, project.version);
      setAsking(null);
      await refreshProjects(client, project.workspaceId);
      if (asking === 'delete') void navigate({ to: '/workspaces/$workspaceId', params: { workspaceId: project.workspaceId } });
    } catch (failure) { setAskError(new Error(authError(failure))); }
    finally { setBusy(false); }
  };
  return <VStack gap={8}>
    <SettingsHead title="일반" description={`${project.name}의 이름과 이슈 번호 앞에 붙는 키를 정합니다.${isArchived ? ' 보관한 프로젝트는 읽기만 됩니다.' : ''}`} />
    <form onSubmit={event => { event.preventDefault(); void save(); }}>
      <SettingsCard title="세부 정보" id="project-details" actions={editable ? <Button type="submit" label="저장" variant="secondary" size="sm" isDisabled={!isChanged} isLoading={isBusy} /> : undefined}>
        <SettingsRow label="아이콘" description="사이드바와 목록에서 프로젝트 이름 앞에 보입니다.">
          {editable ? <MarkPicker value={mark} label="프로젝트 아이콘과 색 고르기" isDisabled={isBusy} onChange={setMark} /> : <ProjectMark project={project} size="md" />}
        </SettingsRow>
        <SettingsRow label="이름">
          {editable ? <TextInput label="이름" isLabelHidden size="sm" value={name} onChange={setName} isRequired isDisabled={isBusy}
            status={nameError ? { type: 'error', message: nameError } : undefined} /> : project.name}
        </SettingsRow>
        <SettingsRow label="키" description={`이슈 번호가 ${key || project.key}-42처럼 붙습니다. 바꿔도 옛 키로 찾을 수 있습니다.`}>
          {editable ? <TextInput label="키" isLabelHidden size="sm" value={key} onChange={value => setKey(value.toUpperCase())} isRequired isDisabled={isBusy}
            status={keyError ? { type: 'error', message: keyError } : undefined} /> : project.key}
        </SettingsRow>
        <SettingsRow label="설명">
          {editable ? <TextArea label="설명" isLabelHidden value={description} onChange={setDescription} rows={2} isDisabled={isBusy} placeholder="이 프로젝트가 하는 일을 한 줄로" />
            : project.description || '설명이 없습니다.'}
        </SettingsRow>
      </SettingsCard>
    </form>
    <FormMessage message={error} /><FormMessage message={notice} isError={false} />
    {canManage && <SettingsCard title="위험 구역" id="project-danger" tone="danger">
      <SettingsRow label={isArchived ? '보관 해제' : '프로젝트 보관'} description={isArchived ? '다시 이슈를 만들고 고칠 수 있게 됩니다.' : '읽을 수만 있게 남기고, 언제든 되돌릴 수 있습니다.'}>
        <Button label={isArchived ? '보관 해제' : '보관'} variant="secondary" size="sm" onClick={() => setAsking('archive')} />
      </SettingsRow>
      <SettingsRow label="프로젝트 삭제" description="프로젝트와 그 이슈가 숨겨집니다. 이슈 번호와 옛 키는 남습니다.">
        <Button label="프로젝트 삭제" variant="destructive" size="sm" onClick={() => setAsking('delete')} />
      </SettingsRow>
    </SettingsCard>}
    {asking === 'archive' && <ConfirmDialog title={isArchived ? '보관을 풀까요?' : '프로젝트를 보관할까요?'} description={isArchived ? '다시 쓰는 프로젝트가 됩니다.' : '보관한 프로젝트는 읽을 수만 있습니다. 여기에서 되돌릴 수 있습니다.'}
      confirmLabel={isArchived ? '보관 해제' : '보관'} isPending={isBusy} error={askError} onClose={() => { setAsking(null); setAskError(null); }} onConfirm={() => { void act(); }} />}
    {asking === 'delete' && <ConfirmDialog title="프로젝트를 삭제할까요?" description="프로젝트와 그 안의 이슈가 목록에서 사라집니다."
      confirmLabel="프로젝트 삭제" variant="destructive" word={project.key} isPending={isBusy} error={askError} onClose={() => { setAsking(null); setAskError(null); }} onConfirm={() => { void act(); }} />}
  </VStack>;
}
