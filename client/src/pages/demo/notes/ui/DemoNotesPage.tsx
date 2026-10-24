import { useCallback, useMemo } from 'react';
import { AvatarGroup, Token } from '@astryxdesign/core';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { DefaultAvatar, ItemList, ItemMeta, ItemRow, ListToolbar, NavIcon, PageFrame, PageState, type ListFilter } from '@/shared/ui';
import { dateText, demoStyles, personOf, projectsIn, SESSIONS, type NotesSearch, type Session } from '@/entities/demo-sample';

/** A note's label as the sample gives it: a meeting's notes are 회의록, an agent's session a 세션 요약 (D-062: labels, not types). */
const LABEL = { meeting: { label: '회의록', icon: 'members' }, agent_session: { label: '세션 요약', icon: 'agent' } } as const;
const labelOf = (note: Session) => LABEL[note.type];

/**
 * PATTERN · 노트 (이슈 메뉴, rows), /demo/w/$workspaceId/notes (D-062, D-063). Records of what was talked over (a
 * meeting's notes, an agent session's summary, a discussion), told apart by their label's mark rather than by type:
 * the key and title, who took part as a group of pictures, how many 결정기록 came out of it and when. The scope
 * (`?project=`) and the label filter are the address's. A phone reads the same rows as cards.
 */
export function DemoNotesPage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/notes' });
  const search = useSearch({ from: '/demo/w/$workspaceId/notes' });
  const navigate = useNavigate();
  const projects = useMemo(() => projectsIn(workspaceId).filter(project => project.status === 'active'), [workspaceId]);
  const scope = projects.find(project => project.id === search.project);
  const go = useCallback((patch: Partial<NotesSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/notes', params: { workspaceId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId]);
  const rows = SESSIONS.filter(note => projects.some(project => project.id === note.projectId) && (!scope || note.projectId === scope.id))
    .filter(note => !search.label || labelOf(note).label === search.label)
    .filter(note => !search.q || note.title.includes(search.q) || note.key.includes(search.q.toUpperCase()));
  const filters: ListFilter[] = [
    { key: 'project', label: '프로젝트', icon: 'board', value: search.project, options: projects.map(project => ({ value: project.id, label: project.name })) },
    { key: 'label', label: '라벨', icon: 'label', value: search.label, options: Object.values(LABEL).map(each => ({ value: each.label, label: each.label })) },
  ];
  return <PageFrame title={scope ? `${scope.name} · 노트` : '노트'} icon="session" chrome="header">
    <ListToolbar search={{ label: '노트 검색', placeholder: '제목이나 번호로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      filters={filters} onFiltersChange={values => go({ project: values.project, label: values.label })}
      action={{ label: '새 노트', icon: 'plus', onClick: () => undefined, isCreate: true }} />
    {rows.length > 0 ? <ItemList label="노트">{rows.map(note => <ItemRow key={note.id}
      lead={<span className={demoStyles.typeMark} title={labelOf(note).label}><NavIcon name={labelOf(note).icon} /></span>}
      title={<><span className={demoStyles.key}>{note.key}</span> {note.title}</>}
      meta={<>
        <ItemMeta width="5.5rem"><Token size="sm" label={labelOf(note).label} /></ItemMeta>
        <ItemMeta label={`참석 ${note.participantIds.length}명`}><AvatarGroup size={20}>{note.participantIds.map(id => <DefaultAvatar key={id} seed={id} name={personOf(id)?.name} size={20} />)}</AvatarGroup></ItemMeta>
        <ItemMeta width="6.5rem">{note.decisions > 0 ? `결정기록 ${note.decisions}개` : <span className={demoStyles.none}>결정기록 없음</span>}</ItemMeta>
        <ItemMeta width="6rem" align="end">{dateText(note.occurredAt)}</ItemMeta>
      </>} />)}</ItemList>
      : <PageState kind={search.q || search.label ? 'search' : 'empty'} title={search.q || search.label ? '조건에 맞는 노트가 없습니다' : '아직 노트가 없습니다'}
        description={search.q || search.label ? '검색어나 필터를 바꿔 보세요.' : '회의록이나 에이전트 세션 요약을 남기면, 거기서 나온 결정기록과 작업이 함께 연결됩니다.'} />}
  </PageFrame>;
}
