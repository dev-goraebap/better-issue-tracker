import { useParams } from '@tanstack/react-router';
import { PageFrame, PageState } from '@/shared/ui';
import { WORKSPACE_SETTINGS_MENU, workspaceOf } from '@/entities/demo-sample';
import { GeneralSettings } from './GeneralSettings';
import { IntegrationsSettings } from './IntegrationsSettings';
import { LabelsSettings } from './LabelsSettings';
import { RolesSettings } from './RolesSettings';

const SECTIONS = { '/general': GeneralSettings, '/roles': RolesSettings, '/labels': LabelsSettings, '/integrations': IntegrationsSettings } as const;

/**
 * PATTERN · 워크스페이스 설정, /demo/w/$workspaceId/settings/$section (the menu turned into the workspace's settings,
 * D-061). One page per menu entry (WORKSPACE_SETTINGS_MENU), each a SettingsHead over SettingsCard sections in the
 * narrow column, as the member's own settings are; an address naming no entry finds nothing.
 */
export function DemoWorkspaceSettingsPage() {
  const { workspaceId, section } = useParams({ from: '/demo/w/$workspaceId/settings/$section' });
  const entry = WORKSPACE_SETTINGS_MENU.find(each => each.path === `/${section}`);
  const Section = SECTIONS[`/${section}` as keyof typeof SECTIONS];
  const workspace = workspaceOf(workspaceId);
  if (!entry || !Section || !workspace) return <PageFrame title="설정" icon="settings"><PageState kind="not-found" title="설정을 찾을 수 없습니다" /></PageFrame>;
  return <PageFrame title={entry.label} icon={entry.icon} width="narrow"><Section workspace={workspace} /></PageFrame>;
}
