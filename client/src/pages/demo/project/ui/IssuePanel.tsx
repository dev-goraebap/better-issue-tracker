import { PageState } from '@/shared/ui';
import { pathOf, searchOf } from '@/shared/lib/routed-panel';
import type { IssueSearch } from '@/entities/demo-sample';
import { IssueDetail } from '@/widgets/demo-issue-detail';

/** An issue's address, as the issue pages open it in their modal. */
export const ISSUE_PATH = /^\/demo\/w\/([^/]+)\/p\/([^/]+)\/work-items\/(?!new$)([^/]+)$/;

/** The page the issue pages' modal shows, by its address: an issue (IssueDetail, its frame drawn as the modal's). */
export function IssuePanel({ href }: { href: string }) {
  const match = ISSUE_PATH.exec(pathOf(href));
  if (!match) return <PageState title="열 수 없는 페이지입니다" description="주소를 확인해 주세요." />;
  return <IssueDetail key={href} workspaceId={match[1]!} projectId={match[2]!} id={match[3]!} search={searchOf(href) as IssueSearch} />;
}
