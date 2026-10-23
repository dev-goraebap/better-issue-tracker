import { useRef, type HTMLAttributes, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { useFillRoom } from '../use-fill-room';
import type { ListSort } from '../sort-menu';
import { SortHeader } from './SortHeader';
import styles from './sheet-table.module.css';

export type SheetColumn<T> = {
  key: string; header: string;
  /** The column's width (a CSS length); the first column, left without one, takes what is left. */
  width?: string;
  render: (row: T) => ReactNode;
  /** The key this column orders the list by: its header opens the column's ways (the table's order). */
  sortKey?: string;
  /** end lays a column of figures (days, counts) against its right edge, in figures of one width. */
  align?: 'end';
};

// What a press on a row leaves alone: the row's own controls.
const CONTROLS = 'a, button, input, label, select, textarea, [role="button"], [role="menuitem"]';
function openRow(event: MouseEvent<HTMLTableSectionElement>) {
  const target = event.target as HTMLElement;
  if (target.closest(CONTROLS) || window.getSelection()?.toString()) return;
  const link = target.closest('tr')?.querySelector<HTMLAnchorElement>(`.${styles.rowLink}`);
  if (!link) return;
  // A press with ⌘/Ctrl or Shift opens the row in another tab or window, as on the link itself.
  if ((event.metaKey || event.ctrlKey || event.shiftKey) && link.href) window.open(link.href, '_blank', 'noopener');
  else link.click();
}

/**
 * A desktop list as Plane's spreadsheet: one 44px line per row from the card's edge to its edge, a grey header band
 * (13px) that sticks under the card's header rows as the page scrolls, hairlines between rows and between columns, the first column (what the row is) kept in sight when the table
 * scrolls sideways, and the others in the secondary colour. A row is opened by its link (SHEET_ROW_LINK, in its
 * first column): pressing anywhere else on the row presses that link, unless it lands on one of the row's own controls
 * or ends a text selection. The table never sorts rows itself: a header's order goes to the page, which reads the list
 * again.
 */
export function SheetTable<T>({ label, columns, rows, rowKey, rowProps, order, minWidth = '56rem', isBusy, foot }: {
  label: string; columns: SheetColumn<T>[]; rows: readonly T[]; rowKey: (row: T) => string;
  /** The list's order, which a column with a sortKey sets from its header. */
  order?: ListSort;
  /** A row's own attributes, such as a mark for a row the member must act on. */
  rowProps?: (row: T) => HTMLAttributes<HTMLTableRowElement> & Record<`data-${string}`, string | undefined>;
  minWidth?: string; isBusy?: boolean;
  /** The line right under the last row (ListSummary: the count and the next slice), before the dot grid. */
  foot?: ReactNode;
}) {
  const head = useRef<HTMLDivElement>(null);
  const ghost = useFillRoom<HTMLDivElement>(true);
  const body = useRef<HTMLDivElement>(null);
  // The header and the rows scroll sideways together, whichever of them the viewer scrolls.
  const follow = (from: RefObject<HTMLDivElement | null>, to: RefObject<HTMLDivElement | null>) => () => {
    if (from.current && to.current && to.current.scrollLeft !== from.current.scrollLeft) to.current.scrollLeft = from.current.scrollLeft;
  };
  const colgroup = <colgroup>{columns.map(column => <col key={column.key} style={column.width ? { width: column.width } : undefined} />)}</colgroup>;
  const cellsOf = (row: T) => columns.map(column => <td key={column.key} data-align={column.align}>
    <div className={styles.cell}>{column.render(row)}</div>
  </td>);
  return <div className={styles.sheet}>
    {/* The header drawn: a table of its own that sticks under the card's header rows, as the rows' table scrolls sideways
        in its own box, which a sticky header inside it could not stick out of. */}
    <div ref={head} className={styles.headBox} onScroll={follow(head, body)}>
      <table className={styles.table} style={{ minWidth }} role="presentation">
        {colgroup}
        <thead><tr>{columns.map(column => <th key={column.key} data-align={column.align}>
          {order && column.sortKey ? <SortHeader label={column.header} order={order} column={column.sortKey} />
            : <span className={styles.head} aria-hidden="true">{column.header}</span>}
        </th>)}</tr></thead>
      </table>
    </div>
    <div ref={body} className={styles.scroll} onScroll={follow(body, head)}>
      <table className={styles.table} style={{ minWidth }} aria-label={label} aria-busy={isBusy || undefined}>
        {colgroup}
        {/* The header again for assistive technology, taking no room: it names each cell's column. */}
        <thead className={styles.quietHead}><tr>{columns.map(column => <th key={column.key} scope="col">
          <span className={styles.quiet}>{column.header}</span>
        </th>)}</tr></thead>
        <tbody onClick={openRow}>{rows.map(row => <tr key={rowKey(row)} {...rowProps?.(row)}>{cellsOf(row)}</tr>)}</tbody>
      </table>
      {/* Under few rows a faint dot grid fills the card's end, fading, so the page does not read as a void: for the eye
          alone, never pressed or read out. */}
      {foot}
      <div ref={ghost} className={styles.ghost} aria-hidden="true" />
    </div>
  </div>;
}
