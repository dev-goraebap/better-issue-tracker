import { useParams } from '@tanstack/react-router';
import { PageFrame, PageState } from '@/shared/ui';
import { PROJECT_SETTINGS_MENU, projectOf } from '@/entities/demo-sample';
import { BoardSettings } from './BoardSettings';
import { ControlSettings } from './ControlSettings';
import { ProjectGeneralSettings } from './ProjectGeneralSettings';
import { RepositorySettings } from './RepositorySettings';

const SECTIONS = { '/general': ProjectGeneralSettings, '/board': BoardSettings, '/control': ControlSettings, '/repository': RepositorySettings } as const;

/**
 * PATTERN · 프로젝트 설정, /demo/w/$workspaceId/settings/projects/$projectId/$section: a project's pages within the
 * workspace's settings (its name in the menu over PROJECT_SETTINGS_MENU, as Kaneo has them), each a SettingsHead over
 * SettingsCard sections. The project menu's 설정 comes here too (D-061).
 */
export function DemoProjectSettingsPage() {
  const { projectId, section } = useParams({ from: '/demo/w/$workspaceId/settings/projects/$projectId/$section' });
  const entry = PROJECT_SETTINGS_MENU.find(each => each.path === `/${section}`);
  const Section = SECTIONS[`/${section}` as keyof typeof SECTIONS];
  const project = projectOf(projectId);
  if (!entry || !Section || !project) return <PageFrame title="설정" icon="settings"><PageState kind="not-found" title="설정을 찾을 수 없습니다" /></PageFrame>;
  return <PageFrame title={`${project.name} · ${entry.label}`} icon={entry.icon} width="narrow"><Section key={project.id} project={project} /></PageFrame>;
}
