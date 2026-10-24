import { useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { PROJECT_SETTINGS_MENU } from '@/shared/config';
import { PageFrame, PageState, QueryMessage } from '@/shared/ui';
import { projectQuery } from '@/entities/project';
import { workspaceQuery } from '@/entities/workspace';
import { BoardSettings } from './BoardSettings';
import { ProjectGeneralSettings } from './ProjectGeneralSettings';

/**
 * PATTERN · 프로젝트 설정, /w/$workspaceId/settings/projects/$projectId/$section: a project's pages within the
 * workspace's settings (its name in the menu over PROJECT_SETTINGS_MENU, as Kaneo has them), each a SettingsHead over
 * SettingsCard sections (D-061).
 */
export function ProjectSettingsPage() {
  const { workspaceId, projectId, section } = useParams({ strict: false }) as { workspaceId: string; projectId: string; section: string };
  const project = useQuery(projectQuery(workspaceId, projectId));
  const role = useQuery(workspaceQuery(workspaceId)).data?.myRole;
  const entry = PROJECT_SETTINGS_MENU.find(each => each.path === `/${section}`);
  if (!entry) return <PageFrame title="설정" icon="settings"><PageState kind="not-found" title="설정을 찾을 수 없습니다" /></PageFrame>;
  const canManage = role === 'owner' || role === 'admin';
  return <PageFrame title={project.data ? `${project.data.name} · ${entry.label}` : entry.label} icon={entry.icon} width="narrow">
    {!project.data ? <QueryMessage pending={project.isPending} error={project.error} retry={() => { void project.refetch(); }} />
      : section === 'general' ? <ProjectGeneralSettings key={project.data.id} project={project.data} canManage={canManage} />
      : <BoardSettings project={project.data} canManage={canManage} />}
  </PageFrame>;
}
