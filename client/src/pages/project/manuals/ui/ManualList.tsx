import { useState, type CSSProperties } from 'react';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListFill, ListSummary, ListToolbar, MarkIcon, MoreMenu, NavIcon, PageState } from '@/shared/ui';
import { manualMark, type Manual, type ManualSearch } from '../model/manual';
import { PALETTE } from '@/shared/config';
import { dateText } from '@/shared/lib/date-text';
import { useSearchScreen } from '@/shared/lib/route-search';
import type { ListFilter, ListSort } from '@/shared/ui';
import { manualModifiedAt, selectManuals, type ManualListEntry } from '../model/manual-list';
import { ManualDialog } from './ManualDialog';
import { ManualHeader } from './ManualHeader';
import { ManualImportDialog } from './ManualImportDialog';
import styles from './manual-list.module.css';

export function ManualList({ entries, search, scopes, projectId, scopeName, onSearch, onOpen, onSave }: {
  entries: ManualListEntry[]; search: ManualSearch; scopes: { value: string; label: string }[]; projectId?: string; scopeName: string;
  onSearch: (patch: Partial<ManualSearch>, replace?: boolean) => void; onOpen: (key: string) => void; onSave: (manual: Manual) => boolean;
}) {
  const [editing, setEditing] = useState<Manual | 'new' | null>(null);
  const [importing, setImporting] = useState(false);
  const finding = useSearchScreen().isOpen;
  const shown = finding && !search.q ? [] : selectManuals(entries, finding ? { q: search.q } : { ...search, scope: projectId ? undefined : search.scope });
  const colors = [...new Set(entries.map(entry => manualMark(entry.manual).color))];
  const filters: ListFilter[] = [
    ...(!projectId ? [{ key: 'scope', label: '소속', icon: 'projects', value: search.scope, isSearchable: true, options: [{ value: 'workspace', label: '워크스페이스 공통' }, ...scopes] }] : []),
    { key: 'color', label: '색상', icon: 'label', value: search.color, options: colors.map(color => ({ value: color, label: PALETTE.find(tone => tone.value === color)?.name ?? color,
      icon: <span className={styles.color} style={{ backgroundColor: color }} /> })) },
  ];
  const order: ListSort = { keys: [{ value: 'updated', label: '수정일', kind: 'date' }, { value: 'title', label: '이름', kind: 'text' }],
    key: search.sort ?? 'updated', direction: search.dir ?? (search.sort === 'title' ? 'asc' : 'desc'), usual: { key: 'updated', direction: 'desc' },
    onChange: (key, dir) => onSearch(key === 'updated' && dir === 'desc' ? { sort: undefined, dir: undefined } : { sort: key as ManualSearch['sort'], dir }, true) };
  return <>
    <ListToolbar search={{ label: '매뉴얼 찾기', placeholder: '이름이나 설명으로 찾기', value: search.q, onChange: q => onSearch({ q: q || undefined }, true) }}
      filters={filters} onFiltersChange={values => onSearch({ ...('scope' in values ? { scope: values.scope } : {}), ...('color' in values ? { color: values.color } : {}) })} order={order}
      action={{ label: '매뉴얼 만들기', icon: 'plus', isCreate: true, onClick: () => setEditing('new') }} />
    <ManualHeader><MoreMenu label="매뉴얼 도구" items={[{ label: '매뉴얼 가져오기', onClick: () => setImporting(true) }]} /></ManualHeader>
    {shown.length ? <>
      <ItemList label="매뉴얼">{shown.map(entry => { const manual = entry.manual; const modified = manualModifiedAt(manual); return <ItemRow key={entry.key} isTitleSingleLine rowProps={{ className: styles.row }}
        lead={<span className={styles.mark} style={{ '--mark': manualMark(manual).color } as CSSProperties} aria-hidden="true"><MarkIcon name={manualMark(manual).icon} /></span>}
        title={<button type="button" className={ITEM_ROW_LINK} onClick={() => onOpen(entry.key)}>{manual.title}</button>} description={manual.description}
        meta={<><ItemMeta width="11rem" title={entry.scopeName}><NavIcon name={entry.projectId ? 'projects' : 'home'} /><span className={styles.scopeName}>{entry.scopeName}{!entry.projectId && ' 공통'}</span></ItemMeta><ItemMeta width="6rem"><NavIcon name="document" />페이지 {manual.pages.length}개</ItemMeta><ItemMeta width="6rem">{modified ? dateText(modified) : undefined}</ItemMeta></>}
        end={<MoreMenu label={`${manual.title} 더보기`} placement="end" alignment="end" items={[
          { label: '매뉴얼 열기', icon: <NavIcon name="manuals" />, onClick: () => onOpen(entry.key) },
          ...(entry.isLocal ? [{ label: '설정', icon: <NavIcon name="settings" />, onClick: () => setEditing(manual) }] : []),
        ]} />} />; })}</ItemList>
      <ListSummary shown={shown.length} total={shown.length} step={shown.length} hasMore={false} onMore={() => undefined} /><ListFill />
    </> : <PageState kind={search.q || search.scope || search.color || finding ? 'search' : 'empty'} title={finding && !search.q ? '매뉴얼을 검색하세요' : search.q || search.scope || search.color ? '조건에 맞는 매뉴얼이 없습니다' : '첫 매뉴얼을 만들어 보세요'} description={search.q || search.scope || search.color || finding ? '이름이나 설명을 검색하거나 필터 조건을 바꿔 보세요.' : '이름을 정하고 필요한 내용을 페이지로 구성하세요.'} />}
    {editing && <ManualDialog scopeName={scopeName} manual={editing === 'new' ? undefined : editing} onSave={onSave} onClose={() => setEditing(null)} />}
    {importing && <ManualImportDialog onSave={onSave} onOpen={onOpen} onClose={() => setImporting(false)} />}
  </>;
}
