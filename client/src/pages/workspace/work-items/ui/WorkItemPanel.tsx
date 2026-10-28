import { PageState } from '@/shared/ui';
import { pathOf, searchOf } from '@/shared/lib/routed-panel';
import type { WorkItemSearch } from '@/entities/work-item';
import { WorkItemDetail } from '@/widgets/work-item-detail';
import { NewWorkItem } from '@/widgets/work-item-editor';

/** A work item's address, as the work item pages open it in their modal. */
export const WORK_ITEM_PATH = /^\/workspaces\/([^/]+)\/projects\/([^/]+)\/work-items\/(?!new$)([^/]+)$/;
/** 새 업무's address, in a project or in 전체. */
export const NEW_PATH = /^\/workspaces\/([^/]+)(?:\/projects\/([^/]+)\/work-items|\/work-items)\/new$/;

/** The page the work item pages' modal shows, by its address: a work item (WorkItemDetail) or 새 업무 (NewWorkItem), each its own frame. */
export function WorkItemPanel({ href }: { href: string }) {
  const making = NEW_PATH.exec(pathOf(href));
  if (making) return <NewWorkItem key={href} workspaceId={making[1]!} projectId={making[2]} status={searchOf(href).status}
    kind={searchOf(href).kind === 'event' ? 'event' : 'task'} typeId={searchOf(href).type} />;
  const match = WORK_ITEM_PATH.exec(pathOf(href));
  if (!match) return <PageState title="열 수 없는 페이지입니다" description="주소를 확인해 주세요." />;
  return <WorkItemDetail key={href} workspaceId={match[1]!} projectId={match[2]!} id={match[3]!} search={searchOf(href) as WorkItemSearch} />;
}
