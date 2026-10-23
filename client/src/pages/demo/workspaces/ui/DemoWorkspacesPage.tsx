import { Link } from '@tanstack/react-router';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, PageFrame } from '@/shared/ui';
import { demoStyles, ROLE_LABELS, WORKSPACES } from '@/entities/demo-sample';

/**
 * PATTERN · 공간 선택, /demo/workspaces (as the real /workspaces). The member's workspaces as rows to pick from, each with
 * the member's role and its size; picking one opens its home. Outside any workspace, so the menu shows none selected.
 */
export function DemoWorkspacesPage() {
  return <PageFrame title="워크스페이스" icon="switcher" width="narrow">
    <div className={demoStyles.flush}>
      <ItemList label="워크스페이스">{WORKSPACES.map(workspace => <ItemRow key={workspace.id}
        lead={<span className={demoStyles.typeMark}>{workspace.name.slice(0, 1)}</span>}
        title={<Link to="/demo/w/$workspaceId" params={{ workspaceId: workspace.id }} className={ITEM_ROW_LINK}>{workspace.name}</Link>}
        meta={<><ItemMeta width="5rem">{ROLE_LABELS[workspace.myRole]}</ItemMeta><ItemMeta width="9rem" align="end">프로젝트 {workspace.projects} · 멤버 {workspace.members}</ItemMeta></>} />)}
      </ItemList>
    </div>
  </PageFrame>;
}
