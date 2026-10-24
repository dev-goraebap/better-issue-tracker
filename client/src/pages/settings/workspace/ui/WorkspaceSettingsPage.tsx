import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { WORKSPACE_SETTINGS_MENU } from '@/shared/config';
import { PageFrame, PageState, QueryMessage } from '@/shared/ui';
import { workspaceQuery } from '@/entities/workspace';
import { GeneralSettings } from './GeneralSettings';
import { LabelsSettings } from './LabelsSettings';
import { RolesSettings } from './RolesSettings';

/**
 * PATTERN · 워크스페이스 설정, /w/$workspaceId/settings/$section (the menu turned into the workspace's settings, D-061).
 * One page per menu entry (WORKSPACE_SETTINGS_MENU), each a SettingsHead over SettingsCard sections in the narrow
 * column; an address naming no entry finds nothing.
 */
export function WorkspaceSettingsPage() {
  const { workspaceId, section } = useParams({ strict: false }) as { workspaceId: string; section: string };
  const workspace = useQuery(workspaceQuery(workspaceId));
  const entry = WORKSPACE_SETTINGS_MENU.find(each => each.path === `/${section}`);
  if (!entry) return <PageFrame title="설정" icon="settings"><PageState kind="not-found" title="설정을 찾을 수 없습니다" /></PageFrame>;
  const role = workspace.data?.myRole;
  return <PageFrame title={entry.label} icon={entry.icon} width="narrow">
    {!workspace.data ? <QueryMessage pending={workspace.isPending} error={workspace.error} retry={() => { void workspace.refetch(); }} />
      : section === 'general' ? <GeneralSettings key={workspace.data.id} workspace={workspace.data} />
      : section === 'roles' ? <RolesSettings workspaceId={workspaceId} />
      : <LabelsSettings workspaceId={workspaceId} canWrite={role === 'owner' || role === 'admin' || role === 'member'} />}
  </PageFrame>;
}
