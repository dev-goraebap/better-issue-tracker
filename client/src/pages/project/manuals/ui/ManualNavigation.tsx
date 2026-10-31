import { NavIcon } from '@/shared/ui';
import { findPages, type Manual } from '../model/manual';
import styles from './manuals.module.css';

export function ManualNavigation({ manual, pageId, query, onPage, onBack, onCreate }: { manual: Manual; pageId?: string; query: string;
  onPage: (id: string) => void; onBack: () => void; onCreate: () => void }) {
  const pages = findPages(manual, query);
  const pageLink = (page: (typeof pages)[number]) => <button type="button" key={page.id} className={styles.pageLink} aria-current={page.id === pageId ? 'page' : undefined} onClick={() => onPage(page.id)}>{page.title}</button>;
  return <nav className={styles.manualNav} aria-label="매뉴얼 탐색"><button type="button" className={styles.back} onClick={onBack}><NavIcon name="back" />모든 매뉴얼</button>
    <h2>{manual.title}</h2>
    <div className={styles.navigationPages}>{query ? <><p className={styles.groupTitle}>검색 결과 {pages.length}개</p>{pages.map(pageLink)}</> : <>
      {pages.filter(page => !page.sectionId).map(pageLink)}
      {manual.sections.map(section => <section key={section.id}><h3 className={styles.groupTitle}>{section.title}</h3>{pages.filter(page => page.sectionId === section.id).map(pageLink)}</section>)}
    </>}</div>{manual.canEdit !== false && <button type="button" className={styles.newPage} onClick={onCreate}><NavIcon name="plus" />페이지 추가</button>}
  </nav>;
}
