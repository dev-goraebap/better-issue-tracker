import { Link } from '@tanstack/react-router';
import { ListToolbar, NavIcon, PageState, StatusToken } from '@/shared/ui';
import { DECISIONS, PersonCell, SESSIONS, type Decision, type Project, type WorkSearch } from '@/entities/demo-sample';
import { Progress } from './Progress';
import styles from './decisions.module.css';

const STATUS = { proposed: { label: '제안', color: 'orange' }, accepted: { label: '확정', color: 'green' }, superseded: { label: '대체됨', color: 'gray' } } as const;
const dayLabel = (iso: string) => { const date = new Date(Date.parse(iso) + 9 * 3_600_000); return `${date.getUTCMonth() + 1}월 ${date.getUTCDate()}일`; };
const monthLabel = (iso: string) => { const date = new Date(Date.parse(iso) + 9 * 3_600_000); return `${date.getUTCFullYear()}년 ${date.getUTCMonth() + 1}월`; };

/**
 * The 결정기록 tab: the project's 결정기록 as a history read down the page (D-062, D-064). First what is still being
 * weighed (제안, no day yet), then the decided ones by month, the latest first, each a dot in its status's colour on one
 * line beside its day; a record says its key and title, its status, who proposed it, how far the work it led to has got
 * (computed, D-012) and the note it came out of. A superseded one fades but stays.
 */
export function DecisionsTab({ workspaceId, project, search, go }: {
  workspaceId: string; project: Project; search: WorkSearch; go: (patch: Partial<WorkSearch>, replace?: boolean) => void;
}) {
  const rows = DECISIONS.filter(decision => decision.projectId === project.id)
    .filter(decision => !search.q || decision.title.includes(search.q) || decision.key.includes(search.q.toUpperCase()));
  const weighing = rows.filter(decision => !decision.decidedAt);
  const decided = rows.filter(decision => decision.decidedAt).sort((a, b) => b.decidedAt!.localeCompare(a.decidedAt!));
  const months = [...new Set(decided.map(decision => monthLabel(decision.decidedAt!)))];
  const sourceOf = (decision: Decision) => SESSIONS.filter(session => session.projectId === decision.projectId && session.decisions > 0
    && decision.decidedAt && session.occurredAt <= decision.decidedAt).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))[0];
  const entry = (decision: Decision) => {
    const source = sourceOf(decision);
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
          {source && <Link to="/demo/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: project.id }} search={{ tab: 'notes' }} className={styles.source}>
            <NavIcon name="session" />{source.key} {source.title}</Link>}
        </div>
      </article>
    </li>;
  };
  return <>
    <ListToolbar search={{ label: '결정기록 검색', placeholder: '제목이나 D-번호로 찾기', value: search.q, onChange: q => go({ q }, true) }}
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
  </>;
}
