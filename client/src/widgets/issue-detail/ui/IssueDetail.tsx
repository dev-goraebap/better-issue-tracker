import { useState, type ReactNode } from 'react';
import { IconButton, MoreMenu, useToast, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError, isNotFound } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import {
  BackLink, ConfirmDialog, MarkdownView, NavIcon, PageState, QueryMessage, SectionHeader, SettingsAction, Surface, usePanelSurface,
} from '@/shared/ui';
import { columnsQuery } from '@/entities/project';
import { canManage, canWrite as canWriteIn, workspaceQuery } from '@/entities/workspace';
import {
  archiveItem, deleteItem, itemQuery, LabelTokens, PersonCell, PriorityMark, refreshItems, StatusBadge, type IssueSearch,
} from '@/entities/issue';
import { branchName, codeLinksQuery, CodeLinkList, integrationsQuery } from '@/entities/repository';
import { refreshTimeline } from '../api/timeline';
import { IssueActivity } from './IssueActivity';
import styles from './detail.module.css';

/**
 * An issue read in full, wherever it is shown (D-069): on its own page (/workspaces/$workspaceId/projects/$projectId/issues/
 * $issueId) or in the modal the issue pages open it in at the same address (RoutedPanel), Surface drawing the frame of
 * either: the page's title row and back, or the modal's head with 크게 보기 and close. Every issue opens here, whatever
 * it is (D-066).
 *
 * - It is read, not written (BIT-22): opening and closing it sends nothing to the server. The title, the description and
 *   the properties change on the edit page its 편집 opens (IssueEditPage); what stays here is commenting, 보관 and 삭제.
 * - The body is its description, rendered; a desktop lays it beside a properties panel, a phone stacks the panel over it
 *   as a row of pills. The panel is Linear's (D-067): under its quiet heads (속성, 라벨) a line per property set (상태,
 *   우선순위, 담당자, 시작일, 기한), then the labels.
 * - The title row ends with 편집 (on the page a round icon chip as the list header's 필터 and 표시, SettingsAction; in
 *   the modal a ghost icon button like the head's others, so the head's icons are one set), and the more
 *   menu: 링크 복사, 브랜치 이름 복사, 보관, then 삭제 behind ConfirmDialog. A change someone else saved first (409)
 *   says so and shows the latest.
 * - Under the description its 활동 (IssueActivity, D-078): what happened to it and its comments on one timeline, the
 *   box to comment at its foot. 연결 comes with the links (T-005).
 */
export function IssueDetail({ workspaceId, projectId, id, search }: { workspaceId: string; projectId: string; id: string; search: IssueSearch }) {
  const panel = usePanelSurface();
  const navigate = useNavigate();
  const client = useQueryClient();
  const toast = useToast();
  const list = { to: '/workspaces/$workspaceId/projects/$projectId', params: { workspaceId, projectId }, search } as const;
  const [isDeleting, setDeleting] = useState(false);
  const result = useQuery(itemQuery(workspaceId, projectId, id));
  const columns = useQuery(columnsQuery(workspaceId, projectId)).data ?? [];
  const hasRepository = (useQuery(integrationsQuery(workspaceId, projectId)).data ?? []).length > 0;
  const links = useQuery({ ...codeLinksQuery(workspaceId, projectId, id), enabled: hasRepository }).data ?? [];
  const role = useQuery(workspaceQuery(workspaceId)).data?.myRole;
  const canWrite = canWriteIn(role);
  const back = <BackLink {...list} label="이슈" />;
  if (result.isPending || (result.error && !result.data && !isNotFound(result.error))) return <Surface title="이슈" back={back} width="default">
    <QueryMessage pending={result.isPending} error={result.error} retry={() => { void result.refetch(); }} />
  </Surface>;
  const item = result.data;
  if (!item) return <Surface title="이슈를 찾을 수 없습니다" back={back} width="default">
    <PageState kind="not-found" title="이슈를 찾을 수 없습니다" description="지워졌거나 주소가 바뀌었습니다. 목록에서 다시 찾아보세요." />
  </Surface>;
  // A change shows in the lists and, as a line of activity, in the issue's timeline.
  const refresh = () => Promise.allSettled([refreshItems(client, workspaceId, projectId), refreshTimeline(client, workspaceId, 'issue', id)]);
  /** 보관 or 삭제 over the version shown; answers whether it was done. */
  const save = async (change: (version: number) => Promise<unknown>): Promise<boolean> => {
    try { await change(item.version); return true; }
    catch (failure) { toast({ body: authError(failure) }); return false; }
    finally { await refresh(); }
  };
  const column = columns.find(each => each.id === item.columnId);
  // Each property set, as a mark; the edit page changes them.
  const properties: [string, ReactNode][] = [
    ...(item.columnCategory ? [['상태', <StatusBadge category={item.columnCategory} name={column?.name} />] as [string, ReactNode]] : []),
    ...(item.priority ? [['우선순위', <PriorityMark priority={item.priority} />] as [string, ReactNode]] : []),
    ['담당자', <span className={styles.person}><PersonCell id={item.assigneeId} name={item.assigneeName} /></span>],
    ...(item.startDate ? [['시작일', <span className={styles.dated}><NavIcon name="calendar" />{dateText(item.startDate)}</span>] as [string, ReactNode]] : []),
    ...(item.dueDate ? [['기한', <span className={styles.dated}><NavIcon name="calendar" />{dateText(item.dueDate)}</span>] as [string, ReactNode]] : []),
  ];
  const leave = () => { if (panel) panel.onClose(); else void navigate(list); };
  const edit = () => void navigate({ to: '/workspaces/$workspaceId/projects/$projectId/issues/$issueId/edit', params: { workspaceId, projectId, issueId: id } });
  const copyBranch = () => {
    const branch = branchName(item.key, item.title);
    void navigator.clipboard?.writeText(branch).then(() => toast({ body: `브랜치 이름을 복사했습니다: ${branch}` }), () => toast({ body: '복사하지 못했습니다' }));
  };
  return <Surface title={item.title} wrapsTitle back={back} width="default" actions={<>
    {canWrite && (panel
      ? <IconButton label="편집" tooltip="편집" variant="ghost" size="sm" icon={<NavIcon name="edit" />} onClick={edit} />
      : <SettingsAction label="편집" tooltip="편집" icon="edit" onClick={edit} />)}
    <MoreMenu label="이슈 메뉴" variant="ghost" size={panel ? 'sm' : undefined} placement="end" items={[
      { label: '링크 복사', icon: <NavIcon name="link" />, onClick: () => void navigator.clipboard?.writeText(`${window.location.origin}/workspaces/${workspaceId}/projects/${projectId}/issues/${id}`) },
      { label: '브랜치 이름 복사', icon: <NavIcon name="branch" />, onClick: copyBranch },
      ...(canWrite ? [
        { label: item.archivedAt ? '보관 해제' : '보관', icon: <NavIcon name="documents" />, onClick: () => { void save(version => archiveItem(workspaceId, projectId, id, version, !item.archivedAt)).then(isSaved => { if (isSaved && !item.archivedAt) leave(); }); } },
        { label: '삭제', icon: <NavIcon name="delete" />, onClick: () => setDeleting(true) },
      ] : []),
    ]} />
  </>}>
    <div className={styles.layout} data-panel={panel ? '' : undefined}>
      <VStack gap={8} className={styles.main}>
        <section aria-labelledby="detail-body">
          <SectionHeader id="detail-body" title="설명" />
          <MarkdownView value={item.description ?? ''} empty="설명이 없습니다." />
        </section>
        {(hasRepository || links.length > 0) && <section aria-labelledby="detail-code">
          <SectionHeader id="detail-code" title="연결된 코드" actions={<SettingsAction label="브랜치 이름 복사" tooltip="브랜치 이름 복사" icon="branch" onClick={copyBranch} />} />
          {links.length > 0 ? <CodeLinkList links={links} />
            : <p className={styles.codeHint}>브랜치나 커밋, PR 제목에 <code>{item.key}</code>를 넣으면 여기에 붙습니다. 브랜치 이름은 오른쪽 버튼으로 복사하세요.</p>}
        </section>}
        <IssueActivity workspaceId={workspaceId} projectId={projectId} issueId={id} canWrite={canWrite} canModerate={canManage(role)} />
      </VStack>
      <aside className={styles.aside} aria-label="속성">
        <h2 className={styles.asideHead}>속성</h2>
        <dl className={styles.properties}>{properties.map(([label, value]) => <div key={label} className={styles.property}>
          <dt className={styles.spoken}>{label}</dt><dd>{value}</dd>
        </div>)}</dl>
        <h2 className={styles.asideHead}>라벨</h2>
        <div className={styles.asideLabels}>{item.labels.length > 0 ? <LabelTokens labels={item.labels} /> : <span className={styles.none}>없음</span>}</div>
        <p className={styles.made}>{item.key} · {dateText(item.createdAt)} 만듦{item.updatedAt !== item.createdAt ? ` · ${dateText(item.updatedAt)} 고침` : ''}</p>
      </aside>
    </div>
    {isDeleting && <ConfirmDialog title="이슈를 삭제할까요?" description={`${item.key} ${item.title}을(를) 삭제합니다. 관리자는 되살릴 수 있습니다.`}
      confirmLabel="삭제" variant="destructive" onClose={() => setDeleting(false)}
      onConfirm={() => { setDeleting(false); void save(version => deleteItem(workspaceId, projectId, id, version)).then(isSaved => { if (isSaved) leave(); }); }} />}
  </Surface>;
}
