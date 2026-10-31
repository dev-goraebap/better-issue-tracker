import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useQuery } from '@tanstack/react-query';
import { CompactDialog, NavIcon, QueryMessage } from '@/shared/ui';
import { navigationQuery } from '@/entities/navigation';
import { NavigationDialog } from './NavigationDialog';

export function NavigationSettings({ workspaceId, projectId }: { workspaceId: string; projectId?: string }) {
  const [open, setOpen] = useState(false); const result = useQuery(navigationQuery(workspaceId, projectId));
  return <><Button label="메뉴 구성" variant="secondary" size="sm" icon={<NavIcon name="grid" />} onClick={() => setOpen(true)} />
    {open && (result.data ? <NavigationDialog initial={result.data} workspaceId={workspaceId} projectId={projectId} onClose={() => setOpen(false)} /> :
      <CompactDialog title="메뉴 구성" footer={null} onClose={() => setOpen(false)}><QueryMessage pending={result.isPending} error={result.error} retry={() => void result.refetch()} /></CompactDialog>)}</>;
}
