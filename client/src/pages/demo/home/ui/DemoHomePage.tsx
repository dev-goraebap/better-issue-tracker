import type { MouseEvent } from 'react';
import { Button, Text, VStack } from '@astryxdesign/core';
import { Link, useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListToolbar, NavIcon, PageFrame, PageState, SectionHeader } from '@/shared/ui';
import { dateText, DECISIONS, ME, NOTICE_ENTRY, PATTERN_MENU, PROJECT_MENU, projectsIn, StatusBadge, WORK_ITEMS, WORKSPACE_MENU } from '@/entities/demo-sample';
import { DemoCalendar, DemoCalendarBar, type DemoCalendarSearch } from '@/widgets/demo-calendar';
import styles from './home.module.css';

/**
 * PATTERN · 홈 (calendar), /demo/w/$workspaceId. Copy this page for a screen whose content is one calendar.
 *
 * - PageFrame chrome="header" with the calendar's own controls (오늘, the period's steps, its title, the … view menu)
 *   in the tab row instead of tabs, and the page's one action (새 작업) at the row's end; the calendar fills the card
 *   under them, as SandboxHr's team calendar does. Its view and day are the address's view and date.
 * - The workspace's short sections (요약, 내 작업, 최근 결정, the demo's screens) sit beside the calendar on a wide
 *   screen and under it otherwise, each a SectionHeader over its content.
 */
export function DemoHomePage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/' });
  const search = useSearch({ from: '/demo/w/$workspaceId/' });
  const navigate = useNavigate();
  const projects = projectsIn(workspaceId).filter(project => project.status === 'active');
  const items = WORK_ITEMS.filter(item => projects.some(project => project.id === item.projectId));
  const mine = items.filter(item => item.assigneeId === ME && item.status !== 'done').slice(0, 4);
  const decisions = DECISIONS.filter(decision => projects.some(project => project.id === decision.projectId));
  const counts = [
    { label: '진행 중', value: items.filter(item => item.status === 'doing').length },
    { label: '검토 대기', value: items.filter(item => item.status === 'review').length },
    { label: '이번 주 완료', value: items.filter(item => item.status === 'done').length },
    { label: '확정된 결정', value: decisions.filter(decision => decision.status === 'accepted').length },
  ];
  const first = projects[0];
  const go = (href: string) => (event: MouseEvent) => { event.preventDefault(); void navigate({ href }); };
  const place = (next: DemoCalendarSearch) => void navigate({ to: '/demo/w/$workspaceId', params: { workspaceId }, search: next });
  const patterns = [
    ...[NOTICE_ENTRY, ...WORKSPACE_MENU].filter(entry => entry.path).map(entry => ({ ...entry, href: `/demo/w/${workspaceId}${entry.path}` })),
    ...(first ? PROJECT_MENU.map(entry => ({ ...entry, label: `${first.name} · ${entry.label}`, href: `/demo/w/${workspaceId}/p/${first.id}${entry.path}` })) : []),
    ...PATTERN_MENU.map(entry => ({ ...entry, href: entry.path })),
  ];
  // A workspace just made has nothing yet: its home says what to do first rather than showing an empty calendar.
  if (!first) return <PageFrame title="홈" icon="home">
    <PageState title="첫 프로젝트를 만들어 보세요" description="작업·결정·세션은 프로젝트 안에 모입니다. 프로젝트를 만들고 멤버를 초대하면 여기에 요약이 보입니다."
      actions={<Button label="프로젝트 만들기" variant="primary" onClick={() => void navigate({ to: '/demo/w/$workspaceId/projects', params: { workspaceId } })} />} />
  </PageFrame>;
  return <PageFrame title="홈" icon="home" chrome="header" tabs={<DemoCalendarBar search={search} onPlace={place} />}>
    <ListToolbar label="홈 동작" action={{ label: '새 작업', icon: 'plus', isCreate: true,
      onClick: () => void navigate({ to: '/demo/w/$workspaceId/p/$projectId/work-items/new', params: { workspaceId, projectId: first.id } }) }} />
    <div className={styles.home}>
      <DemoCalendar workspaceId={workspaceId} search={search} onPlace={place} onOpen={href => void navigate({ href })} />
      <aside className={styles.side} aria-label="워크스페이스 요약">
        <VStack gap={8} className={styles.sections}>
          <section aria-labelledby="demo-summary">
            <SectionHeader id="demo-summary" title="요약" />
            <dl className={styles.figures}>{counts.map(count => <div key={count.label} className={styles.figure}>
              <dt><Text type="supporting" color="secondary">{count.label}</Text></dt><dd className={styles.value}>{count.value}</dd>
            </div>)}</dl>
          </section>
          <section aria-labelledby="demo-mine">
            <SectionHeader id="demo-mine" title="내 작업" actions={<Link to="/demo/w/$workspaceId/p/$projectId" params={{ workspaceId, projectId: first.id }} search={{ view: 'list', assignee: ME }} className={styles.more}>모두 보기</Link>} />
            <ItemList label="내 작업">{mine.map(item => <ItemRow key={item.id}
              title={<Link to="/demo/w/$workspaceId/p/$projectId/work-items/$workItemId" params={{ workspaceId, projectId: item.projectId, workItemId: item.id }} className={ITEM_ROW_LINK}>{item.title}</Link>}
              meta={<ItemMeta width="5.5rem" align="end"><StatusBadge status={item.status} /></ItemMeta>} />)}
            </ItemList>
          </section>
          <section aria-labelledby="demo-decisions">
            <SectionHeader id="demo-decisions" title="최근 결정" actions={<Link to="/demo/w/$workspaceId/p/$projectId/decisions" params={{ workspaceId, projectId: first.id }} className={styles.more}>모두 보기</Link>} />
            <ItemList label="최근 결정">{decisions.slice(0, 3).map(decision => <ItemRow key={decision.id}
              lead={<span className={styles.key}>{decision.key}</span>} title={decision.title}
              meta={<ItemMeta width="5rem" align="end">{decision.decidedAt ? dateText(decision.decidedAt) : '제안됨'}</ItemMeta>} />)}
            </ItemList>
          </section>
          <section aria-labelledby="demo-patterns">
            <SectionHeader id="demo-patterns" title="이 데모의 화면 패턴" />
            <ItemList label="화면 패턴">{patterns.map(entry => <ItemRow key={entry.href}
              lead={<span className={styles.icon}><NavIcon name={entry.icon} /></span>}
              title={<a href={entry.href} className={ITEM_ROW_LINK} onClick={go(entry.href)} title={entry.pattern}>{entry.label}</a>}
              meta={<ItemMeta><span className={styles.pattern}>{entry.pattern}</span></ItemMeta>} />)}
            </ItemList>
          </section>
        </VStack>
      </aside>
    </div>
  </PageFrame>;
}
