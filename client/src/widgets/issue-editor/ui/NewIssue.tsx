import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button, IconButton, Switch, useToast } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { authError } from '@/shared/api';
import { BackLink, DuePicker, FormMessage, NavIcon, PageFoot, PageFrame, PropertyPicker, usePanelSurface } from '@/shared/ui';
import { labelsQuery } from '@/entities/label';
import { columnsQuery, ProjectMark, projectsQuery, type BoardColumn, type Project } from '@/entities/project';
import { useMembers } from '@/entities/workspace';
import { createItem, issueHref, labelOptions, NO_STATUS, peopleOptions, priorityOptions, refreshItems, statusOptions, type Priority } from '@/entities/work-item';
import styles from './create-issue.module.css';

const mark = (project: Project) => <ProjectMark project={project} size="xs" />;

type Draft = { projectId?: string; title: string; body: string; status?: string; priority: Priority; assigneeId?: string; labelIds: string[]; dueDate?: string };

/**
 * Where a new issue starts in a project: the column a board lane's + named, the first column of the category 전체's lane
 * named, none for 상태 없음 (D-066), else the project's first 할 일 column.
 */
function startColumn(columns: readonly BoardColumn[], status?: string): string {
  if (status === NO_STATUS) return NO_STATUS;
  const sorted = [...columns].sort((a, b) => a.position - b.position);
  return sorted.find(column => column.id === status)?.id ?? sorted.find(column => column.category === (status ?? 'todo'))?.id ?? sorted[0]?.id ?? NO_STATUS;
}

/**
 * 새 이슈 as Linear's new issue (D-067), at its own address (D-070): /w/$workspaceId/p/$projectId/work-items/new in a
 * project, /w/$workspaceId/issues/new in 전체 (a project picked in it), ?status= where it starts (a board lane's +). The
 * issue pages open it in a modal near the top of the window over them (RoutedPanel, a masked move), its head the project
 * over '새 이슈' with 크게 보기 and close; reloaded, linked, 크게 보기 or on a phone it is a page, drawn as one (no card,
 * no dialog head): the page's title and way back, the form on the page, the project first among the pills, and 취소 ·
 * 계속 만들기 · 이슈 만들기 in the page's foot row. Either way a borderless title and description, the properties as a row
 * of pills (상태 — the project's columns or 상태 없음 —, 우선순위, 담당자, 라벨, 기한) each opening its searchable menu.
 * Ctrl/⌘+Enter makes it; with 계속 만들기 on it stays and starts a fresh title keeping the properties, else it closes (the
 * modal) or opens the issue made (the page). A toast names what was made, with 보기 to its page.
 */
export function NewIssue({ workspaceId, projectId, status }: { workspaceId: string; projectId?: string; status?: string }) {
  const panel = usePanelSurface();
  const router = useRouter();
  const client = useQueryClient();
  const toast = useToast();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const projects = useInfiniteQuery(projectsQuery(workspaceId)).data?.pages.flatMap(page => page.items) ?? [];
  const labels = useQuery(labelsQuery(workspaceId)).data ?? [];
  const members = useMembers(workspaceId).items;
  const titleBox = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>({ projectId, title: '', body: '', priority: 'medium', labelIds: [] });
  const [isMore, setMore] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch: Partial<Draft>) => setDraft(previous => ({ ...previous, ...patch }));
  const project = projects.find(each => each.id === projectId);
  const target = projects.find(each => each.id === (draft.projectId ?? projects[0]?.id));
  const columns = useQuery({ ...columnsQuery(workspaceId, target?.id ?? ''), enabled: !!target }).data ?? [];
  // The status stays where the member put it; until then, where the address said to start, in the project picked.
  const shownStatus = draft.status && (draft.status === NO_STATUS || columns.some(column => column.id === draft.status)) ? draft.status : startColumn(columns, status);
  const canCreate = !!draft.title.trim() && !!target && !isBusy;
  const create = async () => {
    if (!canCreate || !target) return;
    setBusy(true); setError('');
    try {
      const id = await createItem(workspaceId, target.id, { title: draft.title.trim(), description: draft.body.trim() || null, priority: draft.priority,
        assigneeId: draft.assigneeId ?? null, dueDate: draft.dueDate ?? null, columnId: shownStatus === NO_STATUS ? null : shownStatus, labelIds: draft.labelIds });
      await refreshItems(client, workspaceId, target.id);
      const href = issueHref(workspaceId, { id, projectId: target.id });
      // The toast lives in a layer above the router, so its way to the issue navigates rather than linking.
      toast({ body: `${draft.title.trim()}을(를) 만들었습니다.`, endContent: <Button label="보기" variant="ghost" size="sm" onClick={() => void router.navigate({ href })} /> });
      if (isMore) { set({ title: '', body: '' }); titleBox.current?.focus(); return; }
      if (panel) panel.onClose();
      else void router.navigate({ href, replace: true });
    } catch (failure) { setError(authError(failure)); }
    finally { setBusy(false); }
  };
  const keys = (event: KeyboardEvent) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void create(); } };
  const projectPill = project
    ? <span className={styles.projectChip}>{mark(project)}{project.key}</span>
    : <PropertyPicker label="프로젝트" icon="board" value={target?.id} onChange={value => set({ projectId: value as string, status: undefined })}
      options={projects.map(each => ({ value: each.id, label: each.name, icon: mark(each) }))} />;
  const titleField = <input ref={titleBox} className={styles.title} value={draft.title} placeholder="이슈 제목" aria-label="이슈 제목" autoFocus data-autofocus
    onChange={event => set({ title: event.target.value })} />;
  const descriptionField = <textarea className={styles.description} value={draft.body} placeholder="설명을 덧붙이세요…" aria-label="설명" rows={panel ? 3 : 8}
    onChange={event => set({ body: event.target.value })} />;
  // On the page the project leads the pills, the head being the page's own title.
  const properties = (lead?: ReactNode) => <div className={styles.pills} role="group" aria-label="속성">
    {lead}
    <PropertyPicker label="상태" icon="status" options={statusOptions(columns)} value={shownStatus} onChange={value => set({ status: (value as string | undefined) ?? NO_STATUS })} />
    <PropertyPicker label="우선순위" icon="priority" options={priorityOptions} value={draft.priority} onChange={value => set({ priority: (value as Priority | undefined) ?? 'medium' })} />
    <PropertyPicker label="담당자" icon="person" options={peopleOptions(members)} value={draft.assigneeId} onChange={value => set({ assigneeId: value as string | undefined })} />
    <PropertyPicker label="라벨" icon="label" options={labelOptions(labels)} value={draft.labelIds} isMultiple onChange={value => set({ labelIds: (value as string[] | undefined) ?? [] })} />
    <DuePicker value={draft.dueDate} onChange={dueDate => set({ dueDate })} />
  </div>;
  const more = <Switch label="계속 만들기" size="sm" value={isMore} onChange={setMore} />;
  const submit = <Button label="이슈 만들기" variant="primary" size={panel ? 'sm' : undefined} isDisabled={!canCreate} isLoading={isBusy} onClick={() => { void create(); }}
    tooltip={isMobile ? undefined : 'Ctrl + Enter'} />;
  if (panel) return <div className={styles.dialog} onKeyDown={keys}>
    <header className={styles.head}>
      {projectPill}
      <NavIcon name="forward" />
      <h2 className={styles.headTitle}>새 이슈</h2>
      <span className={styles.headEnd}>
        <IconButton label="크게 보기" tooltip="크게 보기" variant="ghost" size="sm" icon={<NavIcon name="expand-page" />} onClick={() => void router.navigate({ href: panel.pageHref })} />
        <IconButton label="닫기" tooltip="닫기 (Esc)" variant="ghost" size="sm" icon={<NavIcon name="close" />} onClick={panel.onClose} />
      </span>
    </header>
    <div className={styles.body}>{titleField}{descriptionField}</div>
    {properties()}
    {error && <div className={styles.error}><FormMessage message={error} /></div>}
    <footer className={styles.foot}>{more}{submit}</footer>
  </div>;
  // The page is a page: its title and way back are the page's, the form its body on the page itself, the actions its foot row.
  const back = projectId
    ? <BackLink to="/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId }} label="이슈" />
    : <BackLink to="/w/$workspaceId" params={{ workspaceId }} label="이슈" />;
  const leave = () => void router.navigate({ href: projectId ? `/w/${workspaceId}/p/${projectId}` : `/w/${workspaceId}` });
  return <PageFrame title="새 이슈" width="narrow" back={back}>
    <div className={styles.page} onKeyDown={keys}>
      {titleField}
      {descriptionField}
      {properties(projectPill)}
      {error && <FormMessage message={error} />}
    </div>
    <PageFoot start={<Button label="취소" variant="ghost" onClick={leave} />}>{more}{submit}</PageFoot>
  </PageFrame>;
}
