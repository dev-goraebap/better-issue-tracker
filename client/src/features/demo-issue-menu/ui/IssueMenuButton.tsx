import { useState } from 'react';
import { Button, IconButton, Switch } from '@astryxdesign/core';
import { CompactDialog, NavIcon } from '@/shared/ui';
import { ISSUE_MENU, setIssueMenu, useIssueMenu, type IssueMenuKey } from '@/entities/demo-sample';
import { useDragOrder } from './useDragOrder';
import styles from './issue-menu.module.css';

/**
 * The 이슈 group's own control at its head (D-063): a short dialog listing the four issue menus in the member's order,
 * each row dragged by its handle to a new place (or moved with the arrow keys on the handle), and every one but 작업
 * switched off to leave the menu. It changes this member's menu in this workspace only, as it goes; 처음 순서로 puts
 * the usual order back with all shown.
 */
export function IssueMenuButton({ workspaceId }: { workspaceId: string }) {
  const [isOpen, setOpen] = useState(false);
  const prefs = useIssueMenu(workspaceId);
  const order = useDragOrder(prefs.order, next => setIssueMenu(workspaceId, { ...prefs, order: next }));
  const show = (key: IssueMenuKey, isShown: boolean) =>
    setIssueMenu(workspaceId, { ...prefs, hidden: isShown ? prefs.hidden.filter(each => each !== key) : [...prefs.hidden, key] });
  const close = () => setOpen(false);
  return <>
    <IconButton label="이슈 메뉴 조절" tooltip="메뉴 순서·보이기" variant="ghost" size="sm" icon={<NavIcon name="filter" />} onClick={() => setOpen(true)} />
    <CompactDialog isOpen={isOpen} title="이슈 메뉴" width={400} onClose={close}
      footer={<><Button label="처음 순서로" variant="ghost" onClick={() => setIssueMenu(workspaceId, { order: ISSUE_MENU.map(entry => entry.key), hidden: [] })} />
        <Button label="닫기" variant="primary" onClick={close} /></>}>
      <ol ref={order.listRef} className={styles.rows} aria-label="이슈 메뉴 순서">{prefs.order.map((key, index) => {
        const entry = ISSUE_MENU.find(each => each.key === key)!;
        const isShown = !prefs.hidden.includes(key);
        return <li key={key} className={styles.row} data-hidden={!isShown || undefined} data-dragging={order.dragging === index || undefined}>
          <button type="button" className={styles.handle} data-handle aria-label={`${entry.label} 순서 옮기기`} {...order.handle(index)}>
            <NavIcon name="grip" />
          </button>
          <span className={styles.icon}><NavIcon name={entry.icon} /></span>
          <span className={styles.label}>{entry.label}</span>
          {key === 'work'
            ? <span className={styles.switchRoom} aria-hidden="true" />
            : <Switch label={`${entry.label} 보이기`} isLabelHidden size="sm" value={isShown} onChange={value => show(key, value)} />}
        </li>;
      })}</ol>
    </CompactDialog>
  </>;
}
