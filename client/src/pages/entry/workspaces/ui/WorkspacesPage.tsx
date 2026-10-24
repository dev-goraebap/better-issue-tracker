import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { FormMessage, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, PageFrame, PageState, QueryMessage } from '@/shared/ui';
import { ROLE_LABELS, selectWorkspace, useAllWorkspaces, WorkspaceMark } from '@/entities/workspace';
import { CreateWorkspaceDialog } from '@/features/workspace-switcher';
import styles from './workspaces.module.css';

/**
 * PATTERN · 공간 선택, /workspaces. The member's workspaces as rows to pick from, each with its mark and the member's
 * role; picking one makes it the session's and opens its home. 워크스페이스 추가 opens the same dialog as the switcher.
 * Outside any workspace, so the menu shows none selected.
 */
export function WorkspacesPage() {
  const spaces = useAllWorkspaces();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [isCreating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const open = async (id: string) => {
    setError('');
    try { await selectWorkspace(id); } catch (failure) { setError(authError(failure)); }
    await client.invalidateQueries({ queryKey: ['session'] });
    await navigate({ to: '/w/$workspaceId', params: { workspaceId: id } });
  };
  const list = spaces.items;
  return <PageFrame title="워크스페이스" icon="switcher" width="narrow" actions={<Button label="워크스페이스 추가" variant="secondary" onClick={() => setCreating(true)} />}>
    <FormMessage message={error} />
    {!spaces.hasData ? <QueryMessage pending={spaces.isPending} error={spaces.error} retry={() => { void spaces.refetch(); }} />
      : list.length === 0 ? <PageState title="아직 참여한 워크스페이스가 없습니다" description="새로 만들거나 받은 초대 링크로 참여하세요." />
      : <div className={styles.flush}><ItemList label="워크스페이스">{list.map(space => <ItemRow key={space.id} lead={<WorkspaceMark workspace={space} />}
        title={<button type="button" className={`${ITEM_ROW_LINK} ${styles.open}`} onClick={() => { void open(space.id); }}>{space.name}</button>}
        meta={<><ItemMeta width="5rem">{ROLE_LABELS[space.myRole]}</ItemMeta><ItemMeta width="9rem" align="end">{space.slug}</ItemMeta></>} />)}</ItemList></div>}
    <CreateWorkspaceDialog isOpen={isCreating} onClose={() => setCreating(false)} onCreated={id => { setCreating(false); void navigate({ to: '/w/$workspaceId', params: { workspaceId: id } }); }} />
  </PageFrame>;
}
