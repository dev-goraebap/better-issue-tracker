import { Link } from '@tanstack/react-router';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow } from '@/shared/ui';
import { dateText, StatusBadge, type TableSearch, type WorkItem } from '@/entities/demo-sample';

/** A phone's rows: the title on the first line (the whole row opens it), the status, assignee and date as its meta. */
export function MobileRows({ rows, search }: { rows: WorkItem[]; search: TableSearch }) {
  return <ItemList label="작업 목록">{rows.map(row => <ItemRow key={row.id}
    title={<Link to="/demo/items/$id" params={{ id: row.id }} search={search} className={ITEM_ROW_LINK}>{row.title}</Link>}
    meta={<><ItemMeta><StatusBadge status={row.status} /></ItemMeta><ItemMeta label={`수정 ${dateText(row.updatedAt)}`}>{dateText(row.updatedAt)}</ItemMeta></>} />)}
  </ItemList>;
}
