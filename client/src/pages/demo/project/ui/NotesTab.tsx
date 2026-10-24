import { AvatarGroup } from '@astryxdesign/core';
import { DefaultAvatar, ListToolbar, NavIcon, PageState, type ListFilter } from '@/shared/ui';
import { dateText, personOf, SESSIONS, type Project, type Session, type WorkSearch } from '@/entities/demo-sample';
import styles from './notes.module.css';

/** A note's label as the sample gives it: a meeting's notes are 회의록, an agent's session a 세션 요약 (D-062: labels, not types). */
const LABEL = { meeting: { label: '회의록', icon: 'members', tone: 'meeting' }, agent_session: { label: '세션 요약', icon: 'agent', tone: 'session' } } as const;
const labelOf = (note: Session) => LABEL[note.type];

/**
 * The 노트 tab: the project's notes as Google Keep lays them out (D-064), cards of their own height packed into columns,
 * each tinted by its label: the label, the title, a few lines of what was said, then who took part, how many 결정기록
 * came out of it and when. The label filter and the search words are the address's.
 */
export function NotesTab({ project, search, go }: { project: Project; search: WorkSearch; go: (patch: Partial<WorkSearch>, replace?: boolean) => void }) {
  const notes = SESSIONS.filter(note => note.projectId === project.id)
    .filter(note => !search.label || labelOf(note).label === search.label)
    .filter(note => !search.q || note.title.includes(search.q) || note.summary.includes(search.q))
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  const filters: ListFilter[] = [{ key: 'label', label: '라벨', icon: 'label', value: search.label, options: Object.values(LABEL).map(each => ({ value: each.label, label: each.label })) }];
  return <>
    <ListToolbar search={{ label: '노트 검색', placeholder: '제목이나 내용으로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      filters={filters} onFiltersChange={values => go({ label: values.label })} action={{ label: '새 노트', icon: 'plus', onClick: () => undefined, isCreate: true }} />
    {notes.length === 0
      ? <PageState kind={search.q || search.label ? 'search' : 'empty'} title={search.q || search.label ? '조건에 맞는 노트가 없습니다' : '아직 노트가 없습니다'}
        description={search.q || search.label ? '검색어나 필터를 바꿔 보세요.' : '회의록이나 에이전트 세션 요약을 남기면, 거기서 나온 결정기록과 작업이 함께 연결됩니다.'} />
      : <ul className={styles.keep} aria-label="노트">{notes.map(note => <li key={note.id} className={styles.card} data-tone={labelOf(note).tone}>
        <span className={styles.label}><NavIcon name={labelOf(note).icon} />{labelOf(note).label}</span>
        <h3 className={styles.title}>{note.title}</h3>
        <p className={styles.summary}>{note.summary}</p>
        <footer className={styles.foot}>
          <AvatarGroup size={20}>{note.participantIds.map(id => <DefaultAvatar key={id} seed={id} name={personOf(id)?.name} size={20} />)}</AvatarGroup>
          {note.decisions > 0 && <span className={styles.decisions}><NavIcon name="decision" />{note.decisions}</span>}
          <span className={styles.date}>{dateText(note.occurredAt)}</span>
        </footer>
      </li>)}</ul>}
  </>;
}
