import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import { Button, TextInput, useToast } from '@astryxdesign/core';
import { CompactDialog, MoreMenu, NavIcon, SearchToggle } from '@/shared/ui';
import { downloadPage, printManual } from '../model/export-manual';
import { newId, now, pageMarkdown, pagesInOrder, type Manual } from '../model/manual';
import { ManualBody, type ManualHeading } from './ManualBody';
import { ManualComments } from './ManualComments';
import { ManualDialog } from './ManualDialog';
import { ManualEditor } from './ManualEditor';
import { ManualNavigation } from './ManualNavigation';
import { ManualStructure } from './ManualStructure';
import { ManualHeader } from './ManualHeader';
import { useManualNavWidth } from '../model/use-manual-nav-width';
import styles from './manuals.module.css';

export function ManualReader({ manual, pageId, query, onQuery, onPage, onBack, onSave }: { manual: Manual; pageId?: string; query: string;
  onQuery: (query: string) => void; onPage: (id: string) => void; onBack: () => void; onSave: (manual: Manual) => boolean }) {
  const ordered = pagesInOrder(manual); const page = ordered.find(item => item.id === pageId) ?? (!pageId ? ordered[0] : undefined);
  const [headings, setHeadings] = useState<ManualHeading[]>([]); const [active, setActive] = useState('');
  const [editingPage, setEditingPage] = useState<string | null>(null); const editing = editingPage === page?.id;
  const setEditing = (value: boolean) => setEditingPage(value ? page?.id ?? null : null);
  const [comments, setComments] = useState(false); const [structure, setStructure] = useState(false);
  const [settings, setSettings] = useState(false); const [creating, setCreating] = useState(false); const [title, setTitle] = useState('');
  const [sectionId, setSectionId] = useState(''); const [mobilePanel, setMobilePanel] = useState<'navigation' | 'toc' | null>(null);
  const navigation = useManualNavWidth();
  const scroll = useRef<HTMLDivElement>(null); const printed = useRef<HTMLDivElement>(null); const currentPrint = useRef<HTMLDivElement>(null);
  const toast = useToast(); const receiveHeadings = useCallback((items: ManualHeading[]) => setHeadings(items), []);
  const createPage = () => { if (editing) toast({ body: '편집 중인 페이지를 저장하거나 취소한 뒤 추가해 주세요.' }); else setCreating(true); };
  useEffect(() => { scroll.current?.scrollTo(0, 0); setMobilePanel(null); setActive(''); }, [page?.id]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting); if (visible[0]) setActive(visible[0].target.id);
    }, { root: scroll.current, rootMargin: '0px 0px -65% 0px' });
    headings.forEach(heading => { const element = scroll.current?.querySelector<HTMLElement>(`[id="${heading.id}"]`); if (element) observer.observe(element); });
    return () => observer.disconnect();
  }, [headings]);
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast({ body: '복사했습니다.' }); } catch { toast({ body: '브라우저의 복사 권한을 확인해 주세요.' }); } };
  const print = async (all: boolean) => { const element = all ? printed.current : currentPrint.current; if (!element) return;
    try { await printManual(element, all ? manual.title : page?.title ?? manual.title); } catch (error) { toast({ body: error instanceof Error ? error.message : '인쇄 창을 열지 못했습니다.' }); } };
  const at = ordered.findIndex(item => item.id === page?.id);
  const toc = <><h2>이 페이지에서</h2>{headings.length ? headings.map(heading => <button type="button" key={heading.id} data-depth={heading.level} aria-current={active === heading.id ? 'location' : undefined} onClick={() => {
    scroll.current?.querySelector<HTMLElement>(`[id="${heading.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); setActive(heading.id); setMobilePanel(null);
  }}>{heading.title}</button>) : <p>제목이 추가되면 목차가 표시됩니다.</p>}</>;
  return <div className={styles.reader} ref={navigation.root} style={{ '--manual-nav-width': `${navigation.width}px` } as CSSProperties}>
    <div className={styles.mobileTools}><button type="button" aria-expanded={mobilePanel === 'navigation'} onClick={() => setMobilePanel(mobilePanel === 'navigation' ? null : 'navigation')}><NavIcon name="documents" />탐색</button><span>{manual.title}</span><button type="button" aria-expanded={mobilePanel === 'toc'} onClick={() => setMobilePanel(mobilePanel === 'toc' ? null : 'toc')}>목차</button></div>
    <div className={styles.navRegion} data-open={mobilePanel === 'navigation' || undefined}>
      <ManualNavigation manual={manual} pageId={page?.id} query={query} onPage={onPage} onBack={onBack} onCreate={createPage} />
      <div className={styles.manageNav}><button type="button" disabled={editing} onClick={() => setStructure(true)}><NavIcon name="settings" />구성 편집</button><button type="button" disabled={editing} onClick={() => setSettings(true)}>설정</button></div>
      <div className={styles.navigationResize} role="separator" aria-label="매뉴얼 탐색 너비 조절" aria-orientation="vertical" aria-valuemin={200} aria-valuemax={navigation.maximum} aria-valuenow={navigation.width} tabIndex={0} title="끌어서 너비 조절 · 방향키로 이동 · 두 번 눌러 초기화" {...navigation.handle} />
    </div>
    <div className={styles.readRegion}>
      <ManualHeader>
        <SearchToggle label="매뉴얼 내용 검색" placeholder="매뉴얼 안에서 검색" value={query} onChange={value => onQuery(value ?? '')} />
        {page && <div className={styles.headerActions}>
          <button type="button" aria-label="페이지 댓글" aria-expanded={comments} title="댓글" onClick={() => setComments(!comments)}><NavIcon name="comment" /><span>{manual.comments.filter(comment => comment.pageId === page.id && !comment.resolved).length || ''}</span></button>
          <Button label="편집" variant="ghost" size="sm" onClick={() => setEditing(!editing)} isDisabled={editing} />
          <MoreMenu label="페이지 도구" items={[
            { label: 'Markdown 복사', onClick: () => void copy(pageMarkdown(page)) },
            { label: '현재 페이지 목차', onClick: () => setMobilePanel(mobilePanel === 'toc' ? null : 'toc') },
            { label: '페이지 링크 복사', onClick: () => void copy(window.location.href) },
            { label: 'Markdown 내보내기', onClick: () => { void downloadPage(page, manual.assets).catch(error => toast({ body: error instanceof Error ? error.message : '내보내지 못했습니다.' })); } },
            { label: '현재 페이지 PDF로 저장', onClick: () => void print(false) },
            { label: '전체 매뉴얼 PDF로 저장', onClick: () => void print(true) },
          ]} /></div>}
      </ManualHeader>
      {editing && page ? <ManualEditor key={page.id} manual={manual} page={page} onClose={() => setEditing(false)} onSave={(updated, assets) => onSave({ ...manual, assets, pages: manual.pages.map(item => item.id === updated.id ? updated : item) })} /> :
        <div className={styles.readScroll} ref={scroll}><div className={styles.readColumns}><main className={styles.article} aria-label="매뉴얼 본문">
          {page ? <><h1>{page.title}</h1><ManualBody page={page} manual={manual} onHeadings={receiveHeadings} />
            <nav className={styles.previousNext} aria-label="이전 다음 페이지">{at > 0 ? <button type="button" onClick={() => onPage(ordered[at - 1]!.id)}><span>이전</span><strong>{ordered[at - 1]!.title}</strong></button> : <span />}
              {at < ordered.length - 1 && <button type="button" onClick={() => onPage(ordered[at + 1]!.id)}><span>다음</span><strong>{ordered[at + 1]!.title}<NavIcon name="next" /></strong></button>}</nav></> :
            <div className={styles.empty}><NavIcon name="document" /><h1>{pageId ? '페이지를 찾을 수 없습니다' : manual.title}</h1><p>{pageId ? '왼쪽에서 다른 페이지를 선택해 주세요.' : manual.description || '첫 페이지를 작성해 매뉴얼을 시작하세요.'}</p><Button label="페이지 추가" onClick={createPage} /></div>}
        </main>{page && <aside className={styles.toc} data-open={mobilePanel === 'toc' || undefined} aria-label="현재 페이지 목차">{toc}</aside>}</div></div>}
    </div>
    {comments && page && <ManualComments key={page.id} manual={manual} pageId={page.id} onSave={onSave} onClose={() => setComments(false)} />}
    {structure && <ManualStructure manual={manual} onSave={onSave} onClose={() => setStructure(false)} />}
    {settings && <ManualDialog manual={manual} onSave={onSave} onClose={() => setSettings(false)} />}
    {creating && <CompactDialog title="페이지 추가" onClose={() => setCreating(false)} onSubmit={() => {
      if (!title.trim()) return; const id = newId();
      if (onSave({ ...manual, pages: [...manual.pages, { id, title: title.trim(), body: '', sectionId, updatedAt: now() }] })) { setCreating(false); setTitle(''); onPage(id); setEditingPage(id); }
    }} footer={<><Button variant="ghost" label="취소" onClick={() => setCreating(false)} /><Button type="submit" label="페이지 추가" isDisabled={!title.trim()} /></>}>
      <TextInput label="페이지 제목" value={title} onChange={value => setTitle(value.slice(0, 160))} hasAutoFocus /><label className={styles.selectLabel}>섹션<select value={sectionId} onChange={event => setSectionId(event.target.value)}><option value="">최상위</option>{manual.sections.map(section => <option key={section.id} value={section.id}>{section.title}</option>)}</select></label>
    </CompactDialog>}
    <div hidden ref={printed}>{ordered.map(item => <article key={item.id}><h1>{item.title}</h1><ManualBody printable page={item} manual={manual} /></article>)}</div>
    <div hidden ref={currentPrint}>{page && <article><h1>{page.title}</h1><ManualBody printable page={page} manual={manual} /></article>}</div>
  </div>;
}
