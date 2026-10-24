import { BottomSheet, Popover } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useId, useState, type ReactNode } from 'react';
import { MOBILE_QUERY } from '@/shared/config';
import { FrameBody, FrameHead, NavIcon, SheetList } from '@/shared/ui';
import type { Project } from '@/entities/demo-sample';
import styles from './demo-layout.module.css';

const ALL = '';

/**
 * The trail's second step on the home and a project's page, as Kaneo's: the scope in view (전체, which is the home, or a
 * project) with up-and-down chevrons, opening the scopes to switch to (D-065): 전체 first, then the projects, then
 * 프로젝트 만들기 under a rule. A desktop opens them under the step; a phone in a bottom sheet.
 */
export function ScopeSwitcher({ projects, current, mark, onPick, onCreate }: {
  projects: readonly Project[];
  /** The project in view; none is 전체. */
  current?: string;
  mark: (key: string) => ReactNode;
  /** A project's id, or none for 전체. */
  onPick: (projectId?: string) => void;
  onCreate: () => void;
}) {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isOpen, setOpen] = useState(false);
  const titleId = useId();
  const label = projects.find(project => project.id === current)?.name ?? '전체';
  const pick = (value: string) => { setOpen(false); onPick(value === ALL ? undefined : value); };
  const create = () => { setOpen(false); onCreate(); };
  const trigger = (ref?: (node: HTMLElement | null) => void, onClick?: () => void) => <span ref={ref} className={styles.scopeWrap}>
    <button type="button" className={styles.scope} aria-haspopup={isMobile ? 'dialog' : 'menu'} aria-expanded={isOpen} aria-current="page"
      onClick={onClick ?? (() => setOpen(true))}>
      <span className={styles.scopeLabel}>{label}</span><NavIcon name="chevrons-up-down" />
    </button>
  </span>;
  if (isMobile) return <>
    {trigger()}
    {isOpen && <BottomSheet isOpen onOpenChange={setOpen} label="범위" height="hug">
      <FrameHead title="범위" titleId={titleId} onClose={() => setOpen(false)} />
      <FrameBody>
        <SheetList label="범위" value={current ?? ALL} onPick={pick} groups={[
          { choices: [{ value: ALL, label: '전체', icon: <NavIcon name="home" /> }] },
          { title: '프로젝트', choices: projects.map(project => ({ value: project.id, label: project.name, icon: mark(project.key) })) },
        ]} />
        <button type="button" className={styles.scopeCreateRow} onClick={create}><NavIcon name="plus" />프로젝트 만들기</button>
      </FrameBody>
    </BottomSheet>}
  </>;
  return <Popover isOpen={isOpen} onOpenChange={setOpen} placement="below" alignment="start" width={240} label="범위" className={styles.scopeMenu}
    content={<div role="menu" aria-label="범위" className={styles.scopeList}>
      {[{ value: ALL, label: '전체', icon: <NavIcon name="home" /> }, ...projects.map(project => ({ value: project.id, label: project.name, icon: mark(project.key) }))]
        .map((choice, index) => <span key={choice.value} className={styles.scopeGroup}>
          {index === 1 && <span className={styles.scopeHeading}>프로젝트</span>}
          <button type="button" role="menuitemradio" aria-checked={(current ?? ALL) === choice.value} className={styles.scopeItem} onClick={() => pick(choice.value)}>
            <span className={styles.scopeIcon}>{choice.icon}</span><span className={styles.scopeLabel}>{choice.label}</span>
            {(current ?? ALL) === choice.value && <NavIcon name="check" />}
          </button>
        </span>)}
      <hr className={styles.scopeRule} />
      <button type="button" role="menuitem" className={styles.scopeItem} onClick={create}>
        <span className={styles.scopeIcon}><NavIcon name="plus" /></span><span className={styles.scopeLabel}>프로젝트 만들기</span>
      </button>
    </div>}>
    {({ ref, onClick }) => trigger(ref, onClick)}
  </Popover>;
}
