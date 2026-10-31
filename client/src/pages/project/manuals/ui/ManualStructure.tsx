import { useState } from 'react';
import { Button, TextInput } from '@astryxdesign/core';
import { CompactDialog, NavIcon } from '@/shared/ui';
import { movePage, newId, pagesInOrder, type Manual } from '../model/manual';
import styles from './manuals.module.css';

export function ManualStructure({ manual, onSave, onClose }: { manual: Manual; onSave: (manual: Manual) => boolean; onClose: () => void }) {
  const [draft, setDraft] = useState(manual); const [section, setSection] = useState('');
  return <CompactDialog title="매뉴얼 구성" width={680} onClose={onClose} footer={<><Button variant="ghost" label="취소" onClick={onClose} /><Button label="구성 저장" onClick={() => { if (onSave(draft)) onClose(); }} /></>}>
    <div className={styles.sectionCreate}><TextInput label="새 섹션" value={section} onChange={value => setSection(value.slice(0, 100))} placeholder="예: 개발 기준" /><Button variant="secondary" label="추가" isDisabled={!section.trim()} onClick={() => { setDraft({ ...draft, sections: [...draft.sections, { id: newId(), title: section.trim() }] }); setSection(''); }} /></div>
    <div className={styles.structure}>{[{ id: '', title: '최상위' }, ...draft.sections].map((group, index) => <section key={group.id}><div className={styles.structureHeading}>
      {group.id ? <input aria-label={`${group.title} 섹션 이름`} maxLength={100} value={group.title} onChange={event => setDraft({ ...draft, sections: draft.sections.map(item => item.id === group.id ? { ...item, title: event.target.value } : item) })} /> : <strong>최상위</strong>}
      {group.id && <div>{([-1, 1] as const).map(direction => <button type="button" key={direction} aria-label={`${group.title} 섹션 ${direction < 0 ? '위로' : '아래로'}`} disabled={index - 1 + direction < 0 || index - 1 + direction >= draft.sections.length} onClick={() => {
        const sections = [...draft.sections]; const at = index - 1; [sections[at], sections[at + direction]] = [sections[at + direction]!, sections[at]!]; setDraft({ ...draft, sections });
      }}><NavIcon name={direction < 0 ? 'chevron-up' : 'chevron-down'} /></button>)}</div>}</div>
      {pagesInOrder(draft).filter(page => page.sectionId === group.id).map((page, at, siblings) => <div className={styles.structureRow} key={page.id}><span>{page.title}</span>
        <select aria-label={`${page.title} 섹션`} value={page.sectionId} onChange={event => setDraft({ ...draft, pages: draft.pages.map(item => item.id === page.id ? { ...item, sectionId: event.target.value } : item) })}><option value="">최상위</option>{draft.sections.map(s => <option value={s.id} key={s.id}>{s.title}</option>)}</select>
        {([-1, 1] as const).map(direction => <button type="button" key={direction} aria-label={`${page.title} ${direction < 0 ? '위로' : '아래로'}`} disabled={direction < 0 ? at === 0 : at === siblings.length - 1} onClick={() => setDraft(movePage(draft, page.id, direction))}><NavIcon name={direction < 0 ? 'chevron-up' : 'chevron-down'} /></button>)}
      </div>)}
    </section>)}</div>
  </CompactDialog>;
}
