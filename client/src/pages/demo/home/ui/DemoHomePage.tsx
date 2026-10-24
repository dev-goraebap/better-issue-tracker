import { useMemo, useState, type ReactNode } from 'react';
import { Button } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { Link, useNavigate, useParams } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, NavIcon, PageFrame, PageState, SectionHeader } from '@/shared/ui';
import {
  activityOf, contributionsOf, dateText, DECISIONS, demoStyles, HOME_WIDGETS, ME, projectOf, projectsIn, StatusBadge, useHomeLayout, WORK_ITEMS, type HomeWidget,
} from '@/entities/demo-sample';
import { ActivityFeed } from './ActivityFeed';
import { ContributionGraph } from './ContributionGraph';
import { HomeLayoutDialog } from './HomeLayoutDialog';
import styles from './home.module.css';

const TODAY = '2026-10-23';
const seoulDay = (iso: string) => new Date(Date.parse(iso) + 9 * 3_600_000).toISOString().slice(0, 10);

/**
 * PATTERN · 홈 (위젯), /demo/w/$workspaceId (D-064). Copy this page for a screen of sections the member arranges.
 *
 * - The widgets show in the member's order and only those they keep (홈 구성, at the header row's end or over a phone's
 *   widgets, opens the dialog):
 *   활동 잔디 (the workspace's year, GitHub's contribution graph), 최근 활동, 내 작업, 다가오는 마감, 최근 결정기록.
 *   A new member sees the first three.
 * - Each widget is a SectionHeader over its content in one column; a row links to what it names.
 * - A workspace with no projects says what to do first instead.
 */
export function DemoHomePage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/' });
  const navigate = useNavigate();
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const [isArranging, setArranging] = useState(false);
  const layout = useHomeLayout(workspaceId);
  const projects = projectsIn(workspaceId).filter(project => project.status === 'active');
  const inWorkspace = <T extends { projectId: string }>(rows: readonly T[]) => rows.filter(row => projects.some(project => project.id === row.projectId));
  const contributions = useMemo(() => contributionsOf(workspaceId), [workspaceId]);
  const activity = useMemo(() => activityOf(workspaceId), [workspaceId]);
  if (projects.length === 0) return <PageFrame title="홈" icon="home">
    <PageState title="첫 프로젝트를 만들어 보세요" description="작업·노트·결정기록은 프로젝트 안에 모입니다. 프로젝트를 만들면 여기에 활동이 쌓입니다."
      actions={<Button label="프로젝트 만들기" variant="primary" onClick={() => void navigate({ to: '/demo/w/$workspaceId/projects', params: { workspaceId } })} />} />
  </PageFrame>;
  const workLink = (item: (typeof WORK_ITEMS)[number]) => <Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId"
    params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} className={ITEM_ROW_LINK}>{item.title}</Link>;
  const mine = inWorkspace(WORK_ITEMS).filter(item => item.assigneeId === ME && item.status !== 'done').slice(0, 5);
  const upcoming = inWorkspace(WORK_ITEMS).filter(item => item.dueAt && item.status !== 'done' && seoulDay(item.dueAt) >= TODAY)
    .sort((a, b) => a.dueAt!.localeCompare(b.dueAt!)).slice(0, 5);
  const decisions = inWorkspace(DECISIONS).filter(decision => decision.decidedAt).sort((a, b) => b.decidedAt!.localeCompare(a.decidedAt!)).slice(0, 3);
  const empty = (text: string) => <p className={styles.emptyLine}>{text}</p>;
  const widgets: Record<HomeWidget, ReactNode> = {
    contributions: <ContributionGraph days={contributions} />,
    activity: <ActivityFeed workspaceId={workspaceId} items={activity} />,
    mine: mine.length === 0 ? empty('맡은 작업이 없습니다.') : <ItemList label="내 작업">{mine.map(item => <ItemRow key={item.id} lead={<span className={demoStyles.key}>{item.key}</span>}
      title={workLink(item)} meta={<><ItemMeta width="6.5rem"><span className={demoStyles.clip}>{projectOf(item.projectId)?.name}</span></ItemMeta><ItemMeta width="5.5rem"><StatusBadge status={item.status} /></ItemMeta></>} />)}</ItemList>,
    upcoming: upcoming.length === 0 ? empty('다가오는 마감이 없습니다.') : <ItemList label="다가오는 마감">{upcoming.map(item => <ItemRow key={item.id} lead={<span className={demoStyles.key}>{item.key}</span>}
      title={workLink(item)} meta={<ItemMeta width="6rem" align="end">{dateText(item.dueAt!)}</ItemMeta>} />)}</ItemList>,
    decisions: decisions.length === 0 ? empty('아직 결정기록이 없습니다.') : <ItemList label="최근 결정기록">{decisions.map(decision => <ItemRow key={decision.id}
      lead={<span className={demoStyles.key}>{decision.key}</span>}
      title={<Link to="/demo/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: decision.projectId }} search={{ tab: 'decisions' }} className={ITEM_ROW_LINK}>{decision.title}</Link>}
      meta={<ItemMeta width="6rem" align="end">{dateText(decision.decidedAt!)}</ItemMeta>} />)}</ItemList>,
  };
  const shown = layout.order.filter(key => layout.shown.includes(key));
  const arrange = <Button label="홈 구성" variant="secondary" size="sm" icon={<NavIcon name="filter" />} onClick={() => setArranging(true)} />;
  // A phone's header has no room for actions, so 홈 구성 heads the widgets there.
  return <PageFrame title="홈" icon="home" chrome="header" actions={isMobile ? undefined : arrange}>
    <div className={styles.home}>
      {isMobile && <div className={styles.arrangeRow}>{arrange}</div>}
      {shown.length === 0
        ? <PageState title="보일 위젯이 없습니다" description="홈 구성에서 보고 싶은 것을 켜 보세요." actions={<Button label="홈 구성" variant="secondary" onClick={() => setArranging(true)} />} />
        : shown.map(key => <section key={key} aria-labelledby={`home-${key}`} className={styles.widget}>
          <SectionHeader id={`home-${key}`} title={HOME_WIDGETS.find(widget => widget.key === key)!.label} />
          {widgets[key]}
        </section>)}
    </div>
    <HomeLayoutDialog workspaceId={workspaceId} isOpen={isArranging} onClose={() => setArranging(false)} />
  </PageFrame>;
}
