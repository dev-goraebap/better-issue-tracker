import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { Button, IconButton, Switch, useToast } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useRouter } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { BackLink, DefaultAvatar, NavIcon, PageFoot, PageFrame, PropertyPicker, usePanelSurface, type PropertyOption } from '@/shared/ui';
import {
  addIssue, ISSUE_LABELS, LABEL_COLORS, PEOPLE, PRIORITY_LABELS, PriorityMark, projectOf, STATUS_LABELS, StatusBadge, useProjects, type Priority, type Project, type Status,
} from '@/entities/demo-sample';
import { DuePicker } from './DuePicker';
import styles from './create-issue.module.css';

const NONE = 'none';
/** A status, or none: a note or a plan need not move along the workflow (D-066). */
const STATUS_OPTIONS: PropertyOption[] = [...(Object.keys(STATUS_LABELS) as Status[]).map(status => ({ value: status, label: STATUS_LABELS[status], icon: <StatusBadge status={status} isLabelHidden /> })),
  { value: NONE, label: '상태 없음' }];
const PRIORITY_OPTIONS: PropertyOption[] = (Object.keys(PRIORITY_LABELS) as Priority[]).map(priority => ({ value: priority, label: PRIORITY_LABELS[priority], icon: <PriorityMark priority={priority} isLabelHidden /> }));
const PEOPLE_OPTIONS: PropertyOption[] = PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={16} /> }));
const LABEL_OPTIONS: PropertyOption[] = ISSUE_LABELS.map(label => ({ value: label, label, icon: <span className={styles.labelDot} style={{ background: LABEL_COLORS[label] ?? '#95959f' }} /> }));
const mark = (project: Project) => <span className={styles.projectMark}>{project.key.slice(0, 1)}</span>;

type Draft = { projectId?: string; title: string; body: string; status?: Status; priority: Priority; assigneeId?: string; labels: string[]; dueAt?: string };

/**
 * 새 이슈 as Linear's new issue (D-067), at its own address (D-070): /demo/w/$workspaceId/p/$projectId/work-items/new in a
 * project, /demo/w/$workspaceId/issues/new in 전체 (a project picked in it), ?status= where it starts (a board column's +).
 * The issue pages open it in a modal near the top of the window over them (RoutedPanel, a masked move), its head the
 * project over '새 이슈' with 크게 보기 and close; reloaded, linked, 크게 보기 or on a phone it is a page, drawn as one
 * (no card, no dialog head): the page's title and way back, the form on the page, the project first among the pills,
 * and 취소 · 계속 만들기 · 이슈 만들기 in the page's foot row. Either way a borderless title and description, the
 * properties as a row of pills (상태 or 상태 없음, 우선순위, 담당자, 라벨 with 결정기록 among them, 기한) each opening
 * its searchable menu.
 * Ctrl/⌘+Enter makes it; with 계속 만들기 on it stays and starts a fresh title keeping the properties, else it closes (the
 * modal) or opens the issue made (the page). A toast names what was made, with 보기 to its page.
 */
export function NewIssue({ workspaceId, projectId, status = 'todo' }: { workspaceId: string; projectId?: string; status?: Status | 'none' }) {
  const panel = usePanelSurface();
  const router = useRouter();
  const toast = useToast();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const projects = useProjects(workspaceId).filter(each => each.status === 'active');
  const project = projectId ? projectOf(projectId) : undefined;
  const titleBox = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<Draft>(() => ({ projectId: project?.id ?? projects[0]?.id, title: '', body: '', status: status === NONE ? undefined : status,
    priority: 'medium', labels: [] }));
  const [isMore, setMore] = useState(false);
  const set = (patch: Partial<Draft>) => setDraft(previous => ({ ...previous, ...patch }));
  const target = projects.find(each => each.id === draft.projectId) ?? project;
  const canCreate = !!draft.title.trim() && !!target;
  const create = () => {
    if (!canCreate || !target) return;
    const issue = addIssue({ projectId: target.id, title: draft.title.trim(), summary: draft.body.trim() || undefined, status: draft.status, priority: draft.priority,
      assigneeId: draft.assigneeId, labels: draft.labels, dueAt: draft.dueAt });
    const issueHref = `/demo/w/${workspaceId}/p/${issue.projectId}/work-items/${issue.id}`;
    // The toast lives in a layer above the router, so its way to the issue navigates rather than linking.
    toast({ body: `${issue.key} ${issue.title}을(를) 만들었습니다.`, endContent: <Button label="보기" variant="ghost" size="sm" onClick={() => void router.navigate({ href: issueHref })} /> });
    if (isMore) { set({ title: '', body: '' }); titleBox.current?.focus(); return; }
    if (panel) panel.onClose();
    else void router.navigate({ href: issueHref, replace: true });
  };
  const keys = (event: KeyboardEvent) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); create(); } };
  const projectPill = project
    ? <span className={styles.projectChip}>{mark(project)}{project.key}</span>
    : <PropertyPicker label="프로젝트" icon="board" value={draft.projectId} onChange={value => set({ projectId: value as string })}
      options={projects.map(each => ({ value: each.id, label: each.name, icon: mark(each) }))} />;
  const titleField = <input ref={titleBox} className={styles.title} value={draft.title} placeholder="이슈 제목" aria-label="이슈 제목" autoFocus data-autofocus
    onChange={event => set({ title: event.target.value })} />;
  const descriptionField = <textarea className={styles.description} value={draft.body} placeholder="설명을 덧붙이세요…" aria-label="설명" rows={panel ? 3 : 8}
    onChange={event => set({ body: event.target.value })} />;
  // On the page the project leads the pills, the head being the page's own title.
  const properties = (lead?: ReactNode) => <div className={styles.pills} role="group" aria-label="속성">
    {lead}
    <PropertyPicker label="상태" icon="status" options={STATUS_OPTIONS} value={draft.status ?? NONE} onChange={value => set({ status: value === NONE ? undefined : value as Status })} />
    <PropertyPicker label="우선순위" icon="priority" options={PRIORITY_OPTIONS} value={draft.priority} onChange={value => set({ priority: value as Priority })} />
    <PropertyPicker label="담당자" icon="person" options={PEOPLE_OPTIONS} value={draft.assigneeId} onChange={value => set({ assigneeId: value as string })} />
    <PropertyPicker label="라벨" icon="label" options={LABEL_OPTIONS} value={draft.labels} isMultiple onChange={value => set({ labels: (value as string[] | undefined) ?? [] })} />
    <DuePicker value={draft.dueAt} onChange={dueAt => set({ dueAt })} />
  </div>;
  const more = <Switch label="계속 만들기" size="sm" value={isMore} onChange={setMore} />;
  const submit = <Button label="이슈 만들기" variant="primary" size={panel ? 'sm' : undefined} isDisabled={!canCreate} onClick={create} tooltip={isMobile ? undefined : 'Ctrl + Enter'} />;
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
    <footer className={styles.foot}>{more}{submit}</footer>
  </div>;
  // The page is a page: its title and way back are the page's, the form its body on the page itself, the actions its foot row.
  const back = project
    ? <BackLink to="/demo/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: project.id }} label="이슈" />
    : <BackLink to="/demo/w/$workspaceId" params={{ workspaceId }} label="이슈" />;
  const leave = () => void router.navigate({ href: project ? `/demo/w/${workspaceId}/p/${project.id}` : `/demo/w/${workspaceId}` });
  return <PageFrame title="새 이슈" width="narrow" back={back}>
    <div className={styles.page} onKeyDown={keys}>
      {titleField}
      {descriptionField}
      {properties(projectPill)}
    </div>
    <PageFoot start={<Button label="취소" variant="ghost" onClick={leave} />}>{more}{submit}</PageFoot>
  </PageFrame>;
}
