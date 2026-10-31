import { useEffect, useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError, sessionQueryOptions } from '@/shared/api';
import { CompactDialog, ConfirmDialog, FormMessage, MoreMenu, NavIcon, QueryMessage, Select } from '@/shared/ui';
import { projectsQuery, projectMembershipsQuery, removeProjectMember } from '@/entities/project';
import { canManage, changeRole, customRolesQuery, forgetWorkspace, leaveWorkspace, refreshWorkspace, removeMember, ROLE_LABELS, workspaceQuery, type Member } from '@/entities/workspace';
import { MemberProjectsDialog } from '../ui/MemberProjectsDialog';

type Action = { kind: 'role' | 'remove' | 'leave' | 'exclude'; member: Member };

/** One permission-aware set of row actions in both workspace and project member lists. */
export function useMemberActions(workspaceId: string, projectId?: string) {
  const client = useQueryClient(); const navigate = useNavigate();
  const me = useQuery(sessionQueryOptions).data?.user.id;
  const workspace = useQuery(workspaceQuery(workspaceId)).data;
  const roles = useQuery(customRolesQuery(workspaceId));
  const isManager = canManage(workspace, 'MANAGE_MEMBERS');
  const projectsResult = useInfiniteQuery(projectsQuery(workspaceId));
  useEffect(() => { if (projectsResult.hasNextPage && !projectsResult.isFetchingNextPage && !projectsResult.isFetchNextPageError) void projectsResult.fetchNextPage(); }, [projectsResult]);
  const projects = projectsResult.data?.pages.flatMap(page => page.items) ?? [];
  const memberships = useQuery(projectMembershipsQuery(workspaceId));
  const joinedBy = (userId: string) => new Set(memberships.data?.filter(row => row.userId === userId).map(row => row.projectId));
  const joinedProjects = (userId: string) => { const ids = joinedBy(userId); return projects.filter(project => ids.has(project.id)); };
  const [action, setAction] = useState<Action | null>(null);
  const [projectsOf, setProjectsOf] = useState<Member | null>(null);
  const [role, setRole] = useState<string>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const permissions = (member: Member) => member.customRoleId ? roles.data?.find(item => item.id === member.customRoleId)?.permissions ?? ['OWNER']
    : member.role === 'member' ? ['READ', 'WRITE_WORK', 'WRITE_DOCUMENTS', 'MANAGE_LABELS'] : ['READ'];
  const canChange = (member: Member) => member.role !== 'owner' && member.userId !== me && isManager && (workspace?.myRole === 'owner' || member.role !== 'admin' && permissions(member).every(permission => workspace?.permissions?.includes(permission)));
  const roleOptions = [...(workspace?.myRole === 'owner' ? ['admin', 'member', 'viewer'] as const : ['member', 'viewer'] as const)
    .filter(value => value !== 'member' || ['WRITE_WORK', 'WRITE_DOCUMENTS', 'MANAGE_LABELS'].every(permission => workspace?.permissions?.includes(permission)))
    .map(value => ({ value, label: ROLE_LABELS[value] })), ...(roles.data ?? []).filter(item => item.permissions.every(permission => workspace?.permissions?.includes(permission))).map(item => ({ value: item.id, label: item.name }))];
  const ask = (kind: Action['kind'], member: Member) => { setError(''); setRole(member.customRoleId ?? member.role); setAction({ kind, member }); };
  const close = () => { if (!busy) { setAction(null); setError(''); } };
  const confirm = async () => {
    if (!action || busy) return;
    setBusy(true); setError('');
    try {
      if (action.kind === 'role') { if (!role) return; await changeRole(workspaceId, action.member.memberId, role); }
      else if (action.kind === 'remove') await removeMember(workspaceId, action.member.memberId);
      else if (action.kind === 'exclude' && projectId) await removeProjectMember(workspaceId, projectId, action.member.userId);
      else if (action.kind === 'leave') { await leaveWorkspace(workspaceId); forgetWorkspace(client, workspaceId); void navigate({ to: '/workspaces' }); }
      setAction(null);
      await Promise.all([refreshWorkspace(client, workspaceId), client.invalidateQueries({ queryKey: projectMembershipsQuery(workspaceId).queryKey })]);
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  const menu = (member: Member) => <MoreMenu label={`${member.name} 더보기`} placement="end" alignment="end" items={[
    { label: isManager ? '참여 프로젝트 관리' : '참여 프로젝트 보기', icon: <NavIcon name="projects" />, onClick: () => setProjectsOf(member) },
    ...(canChange(member) ? [{ label: '역할 변경', icon: <NavIcon name="roles" />, onClick: () => ask('role', member) }] : []),
    ...(projectId && isManager ? [{ label: '프로젝트에서 제외', icon: <NavIcon name="members" />, onClick: () => ask('exclude', member) }] : []),
    ...(canChange(member) ? [{ label: '워크스페이스에서 내보내기', icon: <NavIcon name="delete" />, onClick: () => ask('remove', member) }] : []),
    ...(member.userId === me && member.role !== 'owner' ? [{ label: '워크스페이스에서 나가기', icon: <NavIcon name="logout" />, onClick: () => ask('leave', member) }] : []),
  ]} />;
  const dialogs = <>
    {projectsOf && (!projectsResult.data || projectsResult.hasNextPage || projectsResult.isError || !memberships.data || memberships.isError
      ? <CompactDialog title={`${projectsOf.name}의 참여 프로젝트`} onClose={() => setProjectsOf(null)} footer={<Button label="닫기" variant="secondary" onClick={() => setProjectsOf(null)} />}><QueryMessage pending={projectsResult.isPending || projectsResult.isFetchingNextPage || memberships.isPending} error={projectsResult.error ?? memberships.error} retry={() => { void projectsResult.refetch(); void memberships.refetch(); }} /></CompactDialog>
      : <MemberProjectsDialog workspaceId={workspaceId} member={projectsOf} projects={projects} joined={joinedBy(projectsOf.userId)} canEdit={isManager} onClose={() => setProjectsOf(null)} />)}
    {action?.kind === 'role' && <CompactDialog title={`${action.member.name} 역할 변경`} onClose={close} onSubmit={() => void confirm()}
      subtitle="워크스페이스 전체에 적용됩니다. API 키 권한도 함께 바뀝니다."
      footer={<><Button label="취소" variant="ghost" isDisabled={busy} onClick={close} /><Button label="변경" type="submit" isLoading={busy} isDisabled={!role || role === (action.member.customRoleId ?? action.member.role)} /></>}>
      <FormMessage message={error} /><Select label="역할" options={roleOptions} value={role} isDisabled={busy} onChange={setRole} />
    </CompactDialog>}
    {action && action.kind !== 'role' && <ConfirmDialog isPending={busy} error={error ? new Error(error) : null} onClose={close} onConfirm={() => void confirm()} variant="destructive"
      title={action.kind === 'remove' ? `${action.member.name}을(를) 워크스페이스에서 내보낼까요?` : action.kind === 'exclude' ? `${action.member.name}을(를) 프로젝트에서 제외할까요?` : '워크스페이스에서 나갈까요?'}
      description={action.kind === 'exclude' ? '워크스페이스 멤버 자격과 역할은 유지됩니다.' : '이 워크스페이스에 접근할 수 없게 됩니다. 다시 참여하려면 새 초대가 필요합니다.'}
      confirmLabel={action.kind === 'remove' ? '내보내기' : action.kind === 'exclude' ? '제외' : '나가기'} />}
  </>;
  return { menu, dialogs, openProjects: setProjectsOf, joinedBy, joinedProjects, isManager, me };
}
