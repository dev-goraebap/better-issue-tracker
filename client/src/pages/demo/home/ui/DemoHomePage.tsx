import { Button, Text, VStack } from '@astryxdesign/core';
import { Link, useNavigate } from '@tanstack/react-router';
import { ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, NavIcon, PageFrame, SectionHeader } from '@/shared/ui';
import styles from './home.module.css';
import { dateText, DECISIONS, DEMO_NAVIGATION, PersonCell, StatusBadge, WORK_ITEMS } from '@/entities/demo-sample';

/**
 * PATTERN · 홈 (sections). Copy this page for a screen of several short sections rather than one list.
 *
 * - PageFrame without chrome: the title stays for screen readers (the trail names the page) and the page's one action
 *   ends the title row. The content keeps to the default 64rem column.
 * - Each section is SectionHeader (a quiet label, its link or button at the end) over its content; the gap between
 *   sections parts them, with no rules or cards around a list.
 * - Figures read as a strip of numbers, not as boxed cards. Short lists are ItemList rows with a "모두 보기" link.
 */
export function DemoHomePage() {
  const navigate = useNavigate();
  const mine = WORK_ITEMS.filter(item => item.assigneeId === 'u1' && item.status !== 'done').slice(0, 4);
  const counts = [
    { label: '진행 중', value: WORK_ITEMS.filter(item => item.status === 'doing').length },
    { label: '검토 대기', value: WORK_ITEMS.filter(item => item.status === 'review').length },
    { label: '이번 주 완료', value: WORK_ITEMS.filter(item => item.status === 'done').length },
    { label: '확정된 결정', value: DECISIONS.filter(decision => decision.status === 'accepted').length },
  ];
  return <PageFrame title="홈" icon="home" actions={<Button label="새 작업" variant="primary" icon={<NavIcon name="plus" />} onClick={() => void navigate({ to: '/demo/items/new' })} />}>
    <VStack gap={8} className={styles.sections}>
      <section aria-labelledby="demo-summary">
        <SectionHeader id="demo-summary" title="요약" />
        <dl className={styles.figures}>{counts.map(count => <div key={count.label} className={styles.figure}>
          <dt><Text type="supporting" color="secondary">{count.label}</Text></dt><dd className={styles.value}>{count.value}</dd>
        </div>)}</dl>
      </section>
      <section aria-labelledby="demo-mine">
        <SectionHeader id="demo-mine" title="내 작업" actions={<Link to="/demo/table" search={{ assignee: 'u1' }} className={styles.more}>모두 보기</Link>} />
        <ItemList label="내 작업">{mine.map(item => <ItemRow key={item.id}
          title={<Link to="/demo/items/$id" params={{ id: item.id }} className={ITEM_ROW_LINK}>{item.title}</Link>}
          meta={<><ItemMeta width="5.5rem"><StatusBadge status={item.status} /></ItemMeta><ItemMeta width="6rem" align="end">{dateText(item.updatedAt)}</ItemMeta></>} />)}
        </ItemList>
      </section>
      <section aria-labelledby="demo-decisions">
        <SectionHeader id="demo-decisions" title="최근 결정" actions={<Link to="/demo/tabs" className={styles.more}>모두 보기</Link>} />
        <ItemList label="최근 결정">{DECISIONS.slice(0, 3).map(decision => <ItemRow key={decision.id}
          lead={<span className={styles.key}>{decision.key}</span>} title={decision.title}
          meta={<><ItemMeta width="8rem"><PersonCell id={decision.ownerId} /></ItemMeta><ItemMeta width="6rem" align="end">{decision.decidedAt ? dateText(decision.decidedAt) : '제안됨'}</ItemMeta></>} />)}
        </ItemList>
      </section>
      <section aria-labelledby="demo-patterns">
        <SectionHeader id="demo-patterns" title="이 데모의 화면 패턴" />
        <ItemList label="화면 패턴">{DEMO_NAVIGATION.filter(entry => entry.path !== '/demo').map(entry => <ItemRow key={entry.path}
          lead={<span className={styles.icon}><NavIcon name={entry.icon} /></span>}
          title={<a href={entry.path} className={ITEM_ROW_LINK} onClick={event => { event.preventDefault(); void navigate({ href: entry.path }); }}>{entry.label}</a>}
          meta={<ItemMeta><span className={styles.pattern}>{entry.pattern}</span></ItemMeta>} />)}
        </ItemList>
      </section>
    </VStack>
  </PageFrame>;
}
