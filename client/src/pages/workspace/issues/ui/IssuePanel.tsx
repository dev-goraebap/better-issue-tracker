import { PageState } from '@/shared/ui';
import { pathOf, searchOf } from '@/shared/lib/routed-panel';
import type { IssueSearch } from '@/entities/issue';
import { IssueDetail } from '@/widgets/issue-detail';
import { NewIssue } from '@/widgets/issue-editor';

/** An issue's address, as the issue pages open it in their modal. */
export const ISSUE_PATH = /^\/workspaces\/([^/]+)\/projects\/([^/]+)\/issues\/(?!new$)([^/]+)$/;
/** 새 이슈's address, in a project or in 전체. */
export const NEW_PATH = /^\/workspaces\/([^/]+)(?:\/projects\/([^/]+)\/issues|\/issues)\/new$/;

/** The page the issue pages' modal shows, by its address: an issue (IssueDetail) or 새 이슈 (NewIssue), each its own frame. */
export function IssuePanel({ href }: { href: string }) {
  const making = NEW_PATH.exec(pathOf(href));
  if (making) return <NewIssue key={href} workspaceId={making[1]!} projectId={making[2]} status={searchOf(href).status} />;
  const match = ISSUE_PATH.exec(pathOf(href));
  if (!match) return <PageState title="열 수 없는 페이지입니다" description="주소를 확인해 주세요." />;
  return <IssueDetail key={href} workspaceId={match[1]!} projectId={match[2]!} id={match[3]!} search={searchOf(href) as IssueSearch} />;
}
