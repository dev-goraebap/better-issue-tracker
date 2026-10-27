import { useState, type ReactNode } from 'react';
import { Popover } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authError } from '@/shared/api';
import { NavIcon } from '@/shared/ui';
import { useMembers } from '@/entities/workspace';
import { react, reactionsQuery, type DetailTarget } from '../api/engagement';
import styles from './engagement.module.css';

const EMOJI = [['👍', '좋아요'], ['👎', '아쉬워요'], ['❤️', '하트'], ['🎉', '축하'], ['🚀', '로켓'], ['👀', '확인 중'], ['✅', '완료'], ['🙏', '감사'], ['💡', '아이디어'], ['🔥', '불꽃'], ['😄', '웃음'], ['🤔', '생각 중'], ['🙂', '미소'], ['😂', '즐거워요'], ['🙌', '만세'], ['💯', '백점'], ['👋', '인사'], ['👌', '좋습니다'], ['⚠️', '주의'], ['❌', '취소'], ['😢', '슬퍼요'], ['😮', '놀라워요'], ['👏', '박수'], ['💪', '힘내요']];

export function ReactionBar({ target, canWrite, children }: { target: DetailTarget; canWrite: boolean; children?: ReactNode }) {
  const client = useQueryClient(); const result = useQuery(reactionsQuery(target));
  const members = useMembers(target.workspaceId).items;
  const [open, setOpen] = useState(false); const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const choose = async (emoji: string) => {
    if (busy) return;
    setBusy(true); setError(''); setOpen(false);
    try { await react(target, emoji, !result.data?.find(each => each.emoji === emoji)?.mine); }
    catch (failure) { setError(authError(failure)); }
    finally { await client.invalidateQueries({ queryKey: reactionsQuery(target).queryKey }); setBusy(false); }
  };
  const picker = <div className={styles.picker}>
    <input aria-label="리액션 찾기" placeholder="리액션 찾기…" value={query} onChange={event => setQuery(event.target.value)} />
    <span className={styles.pickerLabel}>리액션</span>
    <div className={styles.emojis}>{EMOJI.filter(([emoji, label]) => `${emoji} ${label}`.includes(query)).map(([emoji, label]) => <button type="button" key={emoji} aria-label={label} title={label} onClick={() => { void choose(emoji!); }}>{emoji}</button>)}</div>
    {query && !EMOJI.some(([emoji, label]) => `${emoji} ${label}`.includes(query)) && <p>일치하는 리액션이 없습니다.</p>}
  </div>;
  return <div>
    <div className={styles.actions} aria-label="리액션">
      {result.data?.map(each => <button key={each.emoji} type="button" className={styles.reaction} data-mine={each.mine || undefined} aria-pressed={each.mine}
        aria-label={`${EMOJI.find(([emoji]) => emoji === each.emoji)?.[1] ?? each.emoji} ${each.count}명${each.mine ? ', 나도 반응함' : ''}`}
        title={each.userIds.map(id => members.find(member => member.userId === id)?.name ?? '구성원').join(', ')} disabled={!canWrite || busy} onClick={() => { void choose(each.emoji); }}><span>{each.emoji}</span><span>{each.count}</span></button>)}
      {canWrite && <Popover isOpen={open} onOpenChange={next => { setOpen(next); setQuery(''); }} label="리액션 선택" placement="below" alignment="start" width={280} content={picker}>
        {({ ref, onClick }) => <button ref={ref} type="button" className={styles.iconButton} aria-label="리액션 추가" title="리액션 추가" aria-haspopup="dialog" aria-expanded={open} disabled={busy || result.isPending} onClick={onClick}><NavIcon name="reaction" /></button>}
      </Popover>}
      {children}
      {result.error && <button type="button" className={styles.retry} onClick={() => { void result.refetch(); }}>리액션 다시 불러오기</button>}
    </div>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </div>;
}
