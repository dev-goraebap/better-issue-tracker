import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { BottomSheet, Button, Dialog, IconButton, Switch } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { DefaultAvatar, NavIcon, PropertyPicker, type PropertyOption } from '@/shared/ui';
import {
  addWorkItem, LABELS, PEOPLE, PRIORITY_LABELS, PriorityMark, STATUS_LABELS, StatusBadge, type Priority, type Project, type Status, type WorkItem,
} from '@/entities/demo-sample';
import { DuePicker } from './DuePicker';
import styles from './create-issue.module.css';

const LABEL_COLORS: Record<string, string> = { 서버: '#5e6ad2', 화면: '#4cb782', MCP: '#bb87fc', 문서: '#4ea7fc', 배포: '#f2994a', 버그: '#eb5757' };
const STATUS_OPTIONS: PropertyOption[] = (Object.keys(STATUS_LABELS) as Status[]).map(status => ({ value: status, label: STATUS_LABELS[status], icon: <StatusBadge status={status} isLabelHidden /> }));
const PRIORITY_OPTIONS: PropertyOption[] = (Object.keys(PRIORITY_LABELS) as Priority[]).map(priority => ({ value: priority, label: PRIORITY_LABELS[priority], icon: <PriorityMark priority={priority} isLabelHidden /> }));
const PEOPLE_OPTIONS: PropertyOption[] = PEOPLE.map(person => ({ value: person.id, label: person.name, icon: <DefaultAvatar seed={person.id} name={person.name} size={16} /> }));
const LABEL_OPTIONS: PropertyOption[] = LABELS.map(label => ({ value: label, label, icon: <span className={styles.labelDot} style={{ background: LABEL_COLORS[label] ?? '#95959f' }} /> }));
const mark = (project: Project) => <span className={styles.projectMark}>{project.key.slice(0, 1)}</span>;

type Draft = { projectId?: string; title: string; body: string; status: Status; priority: Priority; assigneeId?: string; labels: string[]; dueAt?: string };

/**
 * 새 작업 as Linear's new issue (D-067): a dialog standing near the top of the screen rather than its middle, its head
 * the project (a pill to pick another in 전체) over '새 작업', a borderless title and description, the properties as a
 * row of pills (상태, 우선순위, 담당자, 라벨, 기한) each opening its searchable menu, and at its foot '계속 만들기' beside
 * '작업 만들기'. Ctrl/⌘+Enter makes it; with 계속 만들기 on, the dialog stays and starts a fresh title keeping the
 * properties. A phone opens it as a tall sheet whose pills scroll sideways.
 */
export function CreateIssueDialog({ isOpen, projects, project, status = 'todo', onClose, onCreated }: {
  isOpen: boolean;
  /** The projects one can make it in (전체's), when no project is fixed. */
  projects: readonly Project[];
  /** The project in view, which the item goes into. */
  project?: Project;
  /** Where it starts (a board column's + passes its status). */
  status?: Status;
  onClose: () => void;
  onCreated: (item: WorkItem) => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const titleId = useId();
  const titleBox = useRef<HTMLInputElement>(null);
  const fresh = (): Draft => ({ projectId: project?.id ?? projects[0]?.id, title: '', body: '', status, priority: 'medium', assigneeId: undefined, labels: [] });
  const [draft, setDraft] = useState<Draft>(fresh);
  const [isMore, setMore] = useState(false);
  // Each opening starts afresh in the project and status it was opened for.
  useEffect(() => { if (isOpen) setDraft(fresh()); }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (patch: Partial<Draft>) => setDraft(previous => ({ ...previous, ...patch }));
  const target = projects.find(each => each.id === draft.projectId) ?? project;
  const canCreate = !!draft.title.trim() && !!target;
  const create = () => {
    if (!canCreate || !target) return;
    const item = addWorkItem({ projectId: target.id, title: draft.title.trim(), status: draft.status, priority: draft.priority, assigneeId: draft.assigneeId, labels: draft.labels, dueAt: draft.dueAt });
    onCreated(item);
    if (isMore) { set({ title: '', body: '' }); titleBox.current?.focus(); } else onClose();
  };
  const keys = (event: KeyboardEvent) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); create(); } };
  const content = <div className={styles.dialog} onKeyDown={keys}>
    <header className={styles.head}>
      {project
        ? <span className={styles.projectChip}>{mark(project)}{project.key}</span>
        : <PropertyPicker label="프로젝트" icon="board" value={draft.projectId} onChange={value => set({ projectId: value as string })}
          options={projects.map(each => ({ value: each.id, label: each.name, icon: mark(each) }))} />}
      <NavIcon name="forward" />
      <h2 id={titleId} className={styles.headTitle}>새 작업</h2>
      <span className={styles.headEnd}><IconButton label="닫기" tooltip="닫기 (Esc)" variant="ghost" size="sm" icon={<NavIcon name="close" />} onClick={onClose} /></span>
    </header>
    <div className={styles.body}>
      <input ref={titleBox} className={styles.title} value={draft.title} placeholder="작업 제목" aria-label="작업 제목" autoFocus data-autofocus
        onChange={event => set({ title: event.target.value })} />
      <textarea className={styles.description} value={draft.body} placeholder="설명을 덧붙이세요…" aria-label="설명" rows={isMobile ? 6 : 3}
        onChange={event => set({ body: event.target.value })} />
    </div>
    <div className={styles.pills} role="group" aria-label="속성">
      <PropertyPicker label="상태" icon="status" options={STATUS_OPTIONS} value={draft.status} onChange={value => set({ status: value as Status })} />
      <PropertyPicker label="우선순위" icon="priority" options={PRIORITY_OPTIONS} value={draft.priority} onChange={value => set({ priority: value as Priority })} />
      <PropertyPicker label="담당자" icon="person" options={PEOPLE_OPTIONS} value={draft.assigneeId} onChange={value => set({ assigneeId: value as string })} />
      <PropertyPicker label="라벨" icon="label" options={LABEL_OPTIONS} value={draft.labels} isMultiple onChange={value => set({ labels: (value as string[] | undefined) ?? [] })} />
      <DuePicker value={draft.dueAt} onChange={dueAt => set({ dueAt })} />
    </div>
    <footer className={styles.foot}>
      <Switch label="계속 만들기" size="sm" value={isMore} onChange={setMore} />
      <Button label="작업 만들기" variant="primary" size="sm" isDisabled={!canCreate} onClick={create} tooltip={isMobile ? undefined : 'Ctrl + Enter'} />
    </footer>
  </div>;
  return isMobile
    ? <BottomSheet isOpen={isOpen} onOpenChange={open => { if (!open) onClose(); }} label="새 작업" height="tall" className={styles.sheet}>{content}</BottomSheet>
    : <Dialog isOpen={isOpen} onOpenChange={open => { if (!open) onClose(); }} purpose="form" width={720} padding={0} position={{ top: '12vh' }} aria-labelledby={titleId}
      className={styles.frame}>{content}</Dialog>;
}
