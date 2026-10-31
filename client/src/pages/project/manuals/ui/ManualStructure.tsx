import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { rowReorderStyles as rows, useRowReorder } from '@/shared/lib/row-reorder';
import { CompactDialog, FormMessage, NavIcon } from '@/shared/ui';
import { newId, type Manual } from '../model/manual';
import { manualPageRows, orderManualPages } from '../model/manual-order';
import styles from './manual-structure.module.css';

export function ManualStructure({ manual, onSave, onClose }: { manual: Manual; onSave: (manual: Manual) => Promise<boolean>; onClose: () => void }) {
  const [draft, setDraft] = useState(manual);
  const [section, setSection] = useState('');
  const [error, setError] = useState('');
  const sections = useRowReorder(draft.sections.map(section => ({ id: section.id, name: section.title })),
    { word: '섹션', object: '섹션을', topic: '섹션은' }, rows.ghost,
    async order => { setDraft(current => ({ ...current, sections: order.map(id => current.sections.find(section => section.id === id)!) })); }, failure => setError(String(failure)));
  const pages = useRowReorder(manualPageRows(draft), { word: '페이지', object: '페이지를', topic: '페이지는' }, rows.ghost,
    async order => { setDraft(current => orderManualPages(current, order)); }, failure => setError(String(failure)));
  return <CompactDialog title="매뉴얼 구성" width={680} onClose={onClose} footer={<><Button variant="ghost" label="취소" onClick={onClose} /><Button label="구성 저장" onClick={async () => { if (await onSave(draft)) onClose(); }} /></>}>
    <div className={styles.body}><div className={styles.create}><TextInput label="새 섹션" value={section} onChange={value => setSection(value.slice(0, 100))} placeholder="예: 개발 기준" /><Button variant="secondary" label="추가" isDisabled={!section.trim()} onClick={() => { setDraft({ ...draft, sections: [...draft.sections, { id: newId(), title: section.trim() }] }); setSection(''); }} /></div>
    <p className={styles.help}>손잡이를 끌어 순서를 바꿉니다. 페이지는 다른 섹션 제목 아래로 옮길 수 있습니다.</p>
    <h3 className={styles.heading}>섹션</h3>
    <div ref={sections.list} className={rows.list} role="list" aria-label="매뉴얼 섹션 순서">
      {sections.order.map(id => draft.sections.find(section => section.id === id)!).map(group => <div key={group.id} className={`${rows.row} ${styles.row}`} role="listitem" {...sections.rowProps(group.id)}>
        <button type="button" className={rows.grip} {...sections.gripProps({ id: group.id, name: group.title })}><NavIcon name="grip" /></button>
        <TextInput label={`${group.title} 섹션 이름`} isLabelHidden value={group.title} onChange={title => setDraft({ ...draft, sections: draft.sections.map(item => item.id === group.id ? { ...item, title: title.slice(0, 100) } : item) })} />
      </div>)}
    </div>
    <h3 className={styles.heading}>페이지</h3><p className={styles.help}>최상위</p>
    <div ref={pages.list} className={rows.list} role="list" aria-label="매뉴얼 페이지 순서">
      {pages.order.map(token => token.startsWith('section-')
        ? <div key={token} role="listitem" className={`${rows.row} ${styles.section}`} {...pages.rowProps(token)}>{draft.sections.find(section => section.id === token.slice(8))?.title}<span>여기 아래에 페이지 놓기</span></div>
        : draft.pages.filter(page => page.id === token.slice(5)).map(page => <div key={token} role="listitem" className={`${rows.row} ${styles.row}`} {...pages.rowProps(token)}>
          <button type="button" className={rows.grip} {...pages.gripProps({ id: token, name: page.title })}><NavIcon name="grip" /></button>
          <span className={styles.title}>{page.title}</span>
          <select aria-label={`${page.title} 섹션`} value={page.sectionId} onChange={event => setDraft({ ...draft, pages: draft.pages.map(item => item.id === page.id ? { ...item, sectionId: event.target.value } : item) })}><option value="">최상위</option>{draft.sections.map(section => <option value={section.id} key={section.id}>{section.title}</option>)}</select>
        </div>))}
    </div>
    <span id={sections.hint} className={styles.spoken}>끌거나 Alt와 위아래 화살표로 섹션을 옮깁니다. Esc는 끌기를 취소합니다.</span>
    <span id={pages.hint} className={styles.spoken}>끌거나 Alt와 위아래 화살표로 페이지를 옮깁니다. 섹션 제목을 넘으면 해당 섹션으로 이동합니다. Esc는 끌기를 취소합니다.</span>
    <span className={styles.spoken} role="status" aria-live="polite">{sections.said} {pages.said}</span><FormMessage message={error} /></div>
  </CompactDialog>;
}
