import { useState } from 'react';
import { IconButton, Popover, Switch } from '@astryxdesign/core';
import { NavIcon } from '@/shared/ui';
import { ISSUE_MENU, setIssueMenu, useIssueMenu, type IssueMenuKey } from '@/entities/demo-sample';
import styles from './issue-menu.module.css';

/**
 * The 이슈 group's own control at its head (D-063): a popover listing the four issue menus in the member's order, each
 * moved up or down a place, and every one but 작업 switched off to leave the menu. It changes this member's menu in
 * this workspace only, at once.
 */
export function IssueMenuButton({ workspaceId }: { workspaceId: string }) {
  const [isOpen, setOpen] = useState(false);
  const prefs = useIssueMenu(workspaceId);
  const move = (from: number, by: number) => {
    const order = [...prefs.order];
    const [key] = order.splice(from, 1);
    order.splice(from + by, 0, key!);
    setIssueMenu(workspaceId, { ...prefs, order });
  };
  const show = (key: IssueMenuKey, isShown: boolean) =>
    setIssueMenu(workspaceId, { ...prefs, hidden: isShown ? prefs.hidden.filter(each => each !== key) : [...prefs.hidden, key] });
  const panel = <div className={styles.panel}>
    <span className={styles.panelTitle}>이슈 메뉴</span>
    <ol className={styles.rows}>{prefs.order.map((key, index) => {
      const entry = ISSUE_MENU.find(each => each.key === key)!;
      const isShown = !prefs.hidden.includes(key);
      return <li key={key} className={styles.row} data-hidden={!isShown || undefined}>
        <span className={styles.icon}><NavIcon name={entry.icon} /></span>
        <span className={styles.label}>{entry.label}</span>
        <IconButton label={`${entry.label} 위로`} variant="ghost" size="sm" isDisabled={index === 0} icon={<span className={styles.up}><NavIcon name="forward" /></span>} onClick={() => move(index, -1)} />
        <IconButton label={`${entry.label} 아래로`} variant="ghost" size="sm" isDisabled={index === prefs.order.length - 1}
          icon={<span className={styles.down}><NavIcon name="forward" /></span>} onClick={() => move(index, 1)} />
        {key === 'work'
          ? <span className={styles.switchRoom} aria-hidden="true" />
          : <Switch label={`${entry.label} 보이기`} isLabelHidden size="sm" value={isShown} onChange={value => show(key, value)} />}
      </li>;
    })}</ol>
  </div>;
  return <Popover isOpen={isOpen} onOpenChange={setOpen} placement="end" alignment="start" width={280} label="이슈 메뉴 조절" content={panel}>
    <IconButton label="이슈 메뉴 조절" tooltip="메뉴 순서·보이기" variant="ghost" size="sm" icon={<NavIcon name="filter" />} />
  </Popover>;
}
