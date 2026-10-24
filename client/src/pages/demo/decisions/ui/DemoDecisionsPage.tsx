import { useCallback, useMemo } from 'react';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ListToolbar, NavIcon, PageFrame, PageState, StatusToken, type ListFilter } from '@/shared/ui';
import { DECISIONS, PersonCell, projectsIn, SESSIONS, type Decision, type DecisionsSearch } from '@/entities/demo-sample';
import { Progress } from './Progress';
import styles from './decisions.module.css';

const STATUS = { proposed: { label: '제안', color: 'orange' }, accepted: { label: '확정', color: 'green' }, superseded: { label: '대체됨', color: 'gray' } } as const;
const dayLabel = (iso: string) => { const date = new Date(Date.parse(iso) + 9 * 3_600_000); return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`; };
const monthLabel = (iso: string) => { const date = new Date(Date.parse(iso) + 9 * 3_600_000); return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월`; };

/**
 * PATTERN · 결정기록 (이슈 메뉴, timeline), /demo/w/$workspaceId/decisions (D-062, D-063). Copy this page for records read
 * as a story down the page.
 *
 * - One line runs down the page: first what is still being weighed (제안, no day yet), then the decided ones by month,
 *   the latest first, each a dot in its status's colour on the line beside its day.
 * - A record says its key and title, its status, who proposed it, how far the work it led to has got (computed, D-012)
 *   and the note it came out of; across the whole workspace, its project too. A superseded one fades but stays.
 * - The scope (`?project=`) and the search words are the address's; the sidebar's 프로젝트 list sets the same scope.
 */
export function DemoDecisionsPage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/decisions' });
  const search = useSearch({ from: '/demo/w/$workspaceId/decisions' });
  const navigate = useNavigate();
  const projects = useMemo(() => projectsIn(workspaceId).filter(project => project.status === 'active'), [workspaceId]);
  const scope = projects.find(project => project.id === search.project);
  const go = useCallback((patch: Partial<DecisionsSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/decisions', params: { workspaceId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId]);
  const rows = DECISIONS.filter(decision => projects.some(project => project.id === decision.projectId) && (!scope || decision.projectId === scope.id))
    .filter(decision => !search.q || decision.title.includes(search.q) || decision.key.includes(search.q.toUpperCase()));
  const weighing = rows.filter(decision => !decision.decidedAt);
  const decided = rows.filter(decision => decision.decidedAt).sort((a, b) => b.decidedAt!.localeCompare(a.decidedAt!));
  const months = [...new Set(decided.map(decision => monthLabel(decision.decidedAt!)))];
  const sourceOf = (decision: Decision) => SESSIONS.filter(session => session.projectId === decision.projectId && session.decisions > 0
    && decision.decidedAt && session.occurredAt <= decision.decidedAt).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  const projectFilter: ListFilter = { key: 'project', label: '프로젝트', icon: 'board', value: search.project,
    options: projects.map(project => ({ value: project.id, label: project.name })) };
  const entry = (decision: Decision) => {
    const source = sourceOf(decision);
    const project = projects.find(each => each.id === decision.projectId);
    return <li key={decision.id} className={styles.entry} data-status={decision.status}>
      <span className={styles.when}>{decision.decidedAt ? dayLabel(decision.decidedAt) : '검토 중'}</span>
      <span className={styles.dot} aria-hidden="true" />
      <article className={styles.card} aria-labelledby={`decision-${decision.id}`}>
        <header className={styles.cardHead}>
          <span className={styles.key}>{decision.key}</span>
          <h3 id={`decision-${decision.id}`} className={styles.title}>{decision.title}</h3>
          <StatusToken label={STATUS[decision.status].label} color={STATUS[decision.status].color} />
        </header>
        <div className={styles.meta}>
          <PersonCell id={decision.ownerId} />
          <span className={styles.progress}><span className={styles.metaLabel}>이행</span><Progress value={decision.progress} /></span>
          {source && <Link to="/demo/w/$workspaceId/notes" params={{ workspaceId }} search={{ project: decision.projectId }} className={styles.source}>
            <NavIcon name="session" />{source.key} {source.title}</Link>}
          {!scope && project && <span className={styles.project}>{project.name}</span>}
        </div>
      </article>
    </li>;
  };
  return <PageFrame title={scope ? `${scope.name} · 결정기록` : '결정기록'} icon="decision" chrome="header">
    <ListToolbar search={{ label: '결정기록 검색', placeholder: '제목이나 D-번호로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      filters={[projectFilter]} onFiltersChange={values => go({ project: values.project })}
      action={{ label: '새 결정기록', icon: 'plus', onClick: () => undefined, isCreate: true }} />
    {rows.length === 0
      ? <PageState kind={search.q ? 'search' : 'empty'} title={search.q ? `'${search.q}'에 맞는 결정기록이 없습니다` : '아직 결정기록이 없습니다'}
        description={search.q ? '다른 낱말로 찾아보세요.' : '노트나 작업에서 결정기록을 달면 여기에 시간 순으로 쌓입니다.'} />
      : <div className={styles.timeline}>
        {weighing.length > 0 && <section aria-labelledby="decisions-weighing">
          <h2 id="decisions-weighing" className={styles.group}>검토 중 <span className={styles.count}>{weighing.length}</span></h2>
          <ol className={styles.entries}>{weighing.map(entry)}</ol>
        </section>}
        {months.map(month => {
          const inMonth = decided.filter(decision => monthLabel(decision.decidedAt!) === month);
          return <section key={month} aria-label={month}>
            <h2 className={styles.group}>{month} <span className={styles.count}>{inMonth.length}</span></h2>
            <ol className={styles.entries}>{inMonth.map(entry)}</ol>
          </section>;
        })}
      </div>}
  </PageFrame>;
}
