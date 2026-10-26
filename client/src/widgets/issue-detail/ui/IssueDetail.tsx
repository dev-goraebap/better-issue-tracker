import { useRef, useState, type ReactNode } from 'react';
import { MoreMenu, useToast, VStack } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { authError, isNotFound, type components } from '@/shared/api';
import { dateText } from '@/shared/lib/date-text';
import {
  BackLink, ConfirmDialog, DuePicker, NavIcon, PageState, PropertyPicker, QueryMessage, SectionHeader, SettingsAction, Surface, usePanelSurface,
} from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { columnsQuery } from '@/entities/project';
import { canManage, canWrite as canWriteIn, useMembers, workspaceQuery } from '@/entities/workspace';
import {
  archiveItem, deleteItem, itemQuery, labelOptions, LabelTokens, moveItem, NO_STATUS, peopleOptions, PersonCell, priorityOptions, PriorityMark, refreshItems,
  StatusBadge, statusOptions, updateItem, type IssueSearch, type Priority, type Issue,
} from '@/entities/issue';
import { refreshTimeline } from '../api/timeline';
import { IssueActivity } from './IssueActivity';
import { IssueDescription } from './IssueDescription';
import styles from './detail.module.css';

/**
 * An issue read in full, wherever it is shown (D-069): on its own page (/workspaces/$workspaceId/projects/$projectId/issues/
 * $issueId) or in the modal the issue pages open it in at the same address (RoutedPanel), Surface drawing the frame of
 * either: the page's title row and back, or the modal's head with 크게 보기 and close. Every issue opens here, whatever
 * it is (D-066).
 *
 * - The body is its description; a desktop lays it beside a properties panel, a phone stacks the panel over it as a row
 *   of pills. The panel is Linear's (D-067): under its quiet heads (속성, 라벨) a line per property, each a pill that
 *   opens its menu and saves at once: 상태 (the project's columns, or 상태 없음), 우선순위, 담당자, 시작일, 기한, 라벨.
 *   A viewer reads the same values without the menus.
 * - The description is written in place and saves itself (IssueDescription, D-076); a viewer reads it rendered.
 * - The title row ends with 편집 (the form page for the title and description), a round icon chip as the list header's
 *   필터 and 표시 (SettingsAction), and the more menu: 링크 복사, 보관, then
 *   삭제 behind ConfirmDialog. A change someone else saved first (409) says so and shows the latest.
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
  // Changes run one after another, each over the version the last one left (saving two pills quickly is not a conflict).
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const result = useQuery(itemQuery(workspaceId, projectId, id));
  const columns = useQuery(columnsQuery(workspaceId, projectId)).data ?? [];
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const members = useMembers(workspaceId).items;
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
  const itemKey = itemQuery(workspaceId, projectId, id).queryKey;
  /** Saves one change over the latest version once the changes before it are done; answers whether it was saved. */
  const save = (change: (version: number) => Promise<unknown>): Promise<boolean> => {
    const run = queue.current.then(async () => {
      try { await change(client.getQueryData<Issue>(itemKey)?.version ?? item.version); return true; }
      catch (failure) { toast({ body: authError(failure) }); return false; }
      finally { await refresh(); }
    });
    queue.current = run;
    return run;
  };
  const patch = (body: Omit<components['schemas']['UpdateIssue'], 'expectedVersion'>) => save(version => updateItem(workspaceId, projectId, id, { expectedVersion: version, ...body }));
  const column = columns.find(each => each.id === item.columnId);
  // A viewer reads each property as a mark; a member changes it with its pill.
  const properties: [string, ReactNode][] = canWrite ? [
    ['상태', <PropertyPicker label="상태" icon="status" options={statusOptions(columns)} value={item.columnId ?? NO_STATUS}
      onChange={value => { void save(version => moveItem(workspaceId, projectId, id, { expectedVersion: version, targetColumnId: value === NO_STATUS ? null : value as string })); }} />],
    ['우선순위', <PropertyPicker label="우선순위" icon="priority" options={priorityOptions} value={item.priority ?? undefined} onChange={value => { void patch({ priority: (value as Priority | undefined) ?? null }); }} />],
    ['담당자', <PropertyPicker label="담당자" icon="person" options={peopleOptions(members)} value={item.assigneeId ?? undefined} onChange={value => { void patch({ assigneeId: (value as string | undefined) ?? null }); }} />],
    ['시작일', <DuePicker label="시작일" asDate value={item.startDate} onChange={day => { void patch({ startDate: day ?? null }); }} />],
    ['기한', <DuePicker asDate={item.columnCategory === 'done'} value={item.dueDate} onChange={day => { void patch({ dueDate: day ?? null }); }} />],
  ] : [
    ...(item.columnCategory ? [['상태', <StatusBadge category={item.columnCategory} name={column?.name} />] as [string, ReactNode]] : []),
    ...(item.priority ? [['우선순위', <PriorityMark priority={item.priority} />] as [string, ReactNode]] : []),
    ['담당자', <span className={styles.person}><PersonCell id={item.assigneeId} name={item.assigneeName} /></span>],
    ...(item.startDate ? [['시작일', <span className={styles.dated}><NavIcon name="calendar" />{dateText(item.startDate)}</span>] as [string, ReactNode]] : []),
    ...(item.dueDate ? [['기한', <span className={styles.dated}><NavIcon name="calendar" />{dateText(item.dueDate)}</span>] as [string, ReactNode]] : []),
  ];
  const leave = () => { if (panel) panel.onClose(); else void navigate(list); };
  return <Surface title={item.title} wrapsTitle back={back} width="default" actions={<>
    {canWrite && <SettingsAction label="편집" tooltip="편집" icon="edit"
      onClick={() => void navigate({ to: '/workspaces/$workspaceId/projects/$projectId/issues/$issueId/edit', params: { workspaceId, projectId, issueId: id } })} />}
    <MoreMenu label="이슈 메뉴" variant="ghost" size={panel ? 'sm' : undefined} placement="end" items={[
      { label: '링크 복사', icon: <NavIcon name="link" />, onClick: () => void navigator.clipboard?.writeText(`${window.location.origin}/workspaces/${workspaceId}/projects/${projectId}/issues/${id}`) },
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
          <IssueDescription key={item.id} value={item.description ?? ''} canWrite={canWrite} onSave={description => patch({ description })} />
        </section>
        <IssueActivity workspaceId={workspaceId} projectId={projectId} issueId={id} canWrite={canWrite} canModerate={canManage(role)} />
      </VStack>
      <aside className={styles.aside} aria-label="속성">
        <h2 className={styles.asideHead}>속성</h2>
        <dl className={styles.properties}>{properties.map(([label, value]) => <div key={label} className={styles.property}>
          <dt className={styles.spoken}>{label}</dt><dd>{value}</dd>
        </div>)}</dl>
        <h2 className={styles.asideHead}>라벨</h2>
        <div className={styles.asideLabels}>{canWrite
          ? <PropertyPicker label="라벨" icon="label" options={labelOptions(labels)} value={item.labels.map(label => label.id)} isMultiple
            onChange={value => { void patch({ labelIds: (value as string[] | undefined) ?? [] }); }} />
          : <LabelTokens labels={item.labels} />}</div>
        <p className={styles.made}>{item.key} · {dateText(item.createdAt)} 만듦{item.updatedAt !== item.createdAt ? ` · ${dateText(item.updatedAt)} 고침` : ''}</p>
      </aside>
    </div>
    {isDeleting && <ConfirmDialog title="이슈를 삭제할까요?" description={`${item.key} ${item.title}을(를) 삭제합니다. 관리자는 되살릴 수 있습니다.`}
      confirmLabel="삭제" variant="destructive" onClose={() => setDeleting(false)}
      onConfirm={() => { setDeleting(false); void save(version => deleteItem(workspaceId, projectId, id, version)).then(isSaved => { if (isSaved) leave(); }); }} />}
  </Surface>;
}
