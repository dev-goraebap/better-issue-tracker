import { useParams } from '@tanstack/react-router';
import { PageFrame, PageState } from '@/shared/ui';
import { ADMIN_MENU } from '@/entities/demo-sample';
import { AdminFeatures } from './AdminFeatures';
import { AdminUsers } from './AdminUsers';
import { AdminWorkspaces } from './AdminWorkspaces';

const SECTIONS = { users: AdminUsers, workspaces: AdminWorkspaces, features: AdminFeatures } as const;

/**
 * PATTERN · 인스턴스 관리, /demo/admin/$section (the real /admin/…): the instance's settings for its administrators,
 * outside any workspace, shown under the workspace's settings in the menu (D-061).
 */
export function DemoAdminPage() {
  const { section } = useParams({ from: '/demo/admin/$section' });
  const entry = ADMIN_MENU.find(each => each.path === `/demo/admin/${section}`);
  const Section = SECTIONS[section as keyof typeof SECTIONS];
  if (!entry || !Section) return <PageFrame title="인스턴스 관리" icon="settings"><PageState kind="not-found" title="설정을 찾을 수 없습니다" /></PageFrame>;
  return <PageFrame title={entry.label} icon={entry.icon} width="narrow"><Section /></PageFrame>;
}
