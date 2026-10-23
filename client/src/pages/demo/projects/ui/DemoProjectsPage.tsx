import { useCallback, useId, useMemo } from 'react';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListToolbar, PageFrame, PageState, PageTabs, SHEET_ROW_LINK, SheetTable, type PageTab, type SheetColumn } from '@/shared/ui';
import { dateText, demoStyles, PersonCell, projectsIn, WORK_ITEMS, type Project, type ProjectsSearch } from '@/entities/demo-sample';

type Tab = 'active' | 'archived';
const TABS: PageTab<Tab>[] = [{ value: 'active', label: '진행 중', icon: 'board' }, { value: 'archived', label: '보관됨', icon: 'lock' }];

/**
 * PATTERN · 탭 목록 (모든 프로젝트), /demo/w/$workspaceId/projects (as the real /projects?status=archived). Projects as a
 * table: the name links the row to the project's work, its key, lead, open work and last change; archived ones in their
 * own tab. A phone reads them as cards.
 */
export function DemoProjectsPage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/projects' });
  const search = useSearch({ from: '/demo/w/$workspaceId/projects' });
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const panelId = useId();
  const tab: Tab = search.status ?? 'active';
  const go = useCallback((patch: Partial<ProjectsSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/projects', params: { workspaceId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId]);
  const rows = useMemo(() => projectsIn(workspaceId).filter(project => project.status === tab && (!search.q || project.name.includes(search.q) || project.key.includes(search.q.toUpperCase()))), [workspaceId, tab, search.q]);
  const open = (project: Project) => WORK_ITEMS.filter(item => item.projectId === project.id && item.status !== 'done').length;
  const columns = useMemo<SheetColumn<Project>[]>(() => [
    { key: 'name', header: '프로젝트', render: row => <Link to="/demo/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: row.id }} className={SHEET_ROW_LINK}>{row.name}</Link> },
    { key: 'key', header: '키', width: '6rem', render: row => <span className={demoStyles.key}>{row.key}</span> },
    { key: 'lead', header: '리드', width: '9rem', render: row => <PersonCell id={row.leadId} /> },
    { key: 'open', header: '진행 중 작업', width: '8rem', align: 'end', render: row => `${open(row)}개` },
    { key: 'updated', header: '최근 변경', width: '8rem', render: row => dateText(row.updatedAt) },
  ], [workspaceId]);
  return <PageFrame title="모든 프로젝트" icon="board" chrome="header"
    tabs={<PageTabs value={tab} items={TABS} panelId={panelId} onChange={next => go({ status: next === 'active' ? undefined : 'archived' })} />}>
    <ListToolbar search={{ label: '프로젝트 검색', placeholder: '이름이나 키로 찾기', value: search.q, onChange: q => go({ q }, true) }}
      action={{ label: '프로젝트 만들기', icon: 'plus', onClick: () => undefined, isCreate: true }} />
    <div role="tabpanel" id={panelId}>
      {rows.length === 0 ? <PageState kind={search.q ? 'search' : 'empty'} title={search.q ? `'${search.q}'에 맞는 프로젝트가 없습니다` : tab === 'archived' ? '보관한 프로젝트가 없습니다' : '아직 프로젝트가 없습니다'}
        description={search.q ? '다른 이름이나 키로 찾아보세요.' : '프로젝트를 만들면 작업·결정·세션을 그 안에 모을 수 있습니다.'} />
        : isMobile
          ? <ItemList label="프로젝트">{rows.map(row => <ItemRow key={row.id} lead={<span className={demoStyles.typeMark}>{row.key.slice(0, 1)}</span>}
            title={<Link to="/demo/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: row.id }} className={ITEM_ROW_LINK}>{row.name}</Link>}
            meta={<><ItemMeta><span className={demoStyles.key}>{row.key}</span></ItemMeta><ItemMeta>진행 중 {open(row)}개</ItemMeta><ItemMeta>{dateText(row.updatedAt)}</ItemMeta></>} />)}</ItemList>
          : <SheetTable label="프로젝트" columns={columns} rows={rows} rowKey={row => row.id} minWidth="44rem" />}
    </div>
  </PageFrame>;
}
