import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { NavIcon, SearchToggle } from '@/shared/ui';
import type { Manual } from '../model/manual';
import { ManualCover } from './ManualCover';
import { ManualDialog } from './ManualDialog';
import { ManualHeader } from './ManualHeader';
import styles from './manuals.module.css';

export function ManualList({ manuals, onOpen, onSave }: { manuals: Manual[]; onOpen: (id: string) => void; onSave: (manual: Manual) => boolean }) {
  const [query, setQuery] = useState(''); const [creating, setCreating] = useState(false);
  const shown = manuals.filter(manual => `${manual.title} ${manual.description}`.toLowerCase().includes(query.toLowerCase()));
  return <div className={styles.library}>
    <ManualHeader><SearchToggle label="매뉴얼 찾기" placeholder="매뉴얼 찾기" value={query} onChange={value => setQuery(value ?? '')} />
      <div className={styles.headerActions} data-page-action><Button label="매뉴얼 만들기" variant="primary" size="sm" className="bit-create-action" icon={<NavIcon name="plus" />} onClick={() => setCreating(true)} /></div>
    </ManualHeader>
    <header className={styles.libraryHeader}><div><h1>매뉴얼</h1><p>사용법과 개발 지침을 체계적으로 정리하세요.</p></div><span className={styles.manualCount}>{shown.length}개 매뉴얼</span></header>
    <div className={styles.cards}>{shown.map(manual => <button type="button" className={styles.card} key={manual.id} onClick={() => onOpen(manual.id)}>
      <ManualCover cover={manual.cover} image={manual.image} /><div className={styles.cardText}><h2>{manual.title}<NavIcon name="forward" /></h2><p>{manual.description || '설명이 없습니다.'}</p><span><NavIcon name="document" />페이지 {manual.pages.length}개</span></div>
    </button>)}</div>
    {!shown.length && <div className={styles.empty}><NavIcon name="document" /><h2>{query ? '검색 결과가 없습니다' : '첫 매뉴얼을 만들어 보세요'}</h2><p>{query ? '다른 검색어로 찾아보세요.' : '이름을 정하고 필요한 내용을 페이지로 구성하세요.'}</p></div>}
    {creating && <ManualDialog onSave={onSave} onClose={() => setCreating(false)} />}
  </div>;
}
