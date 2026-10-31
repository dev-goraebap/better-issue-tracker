import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { MarkdownEditor, MarkdownView, NavIcon } from '@/shared/ui';
import { newId, now, type Manual } from '../model/manual';
import styles from './manuals.module.css';

export function ManualComments({ manual, pageId, onSave, onClose }: { manual: Manual; pageId: string; onSave: (manual: Manual) => Promise<boolean>; onClose: () => void }) {
  const [body, setBody] = useState(''); const [resolved, setResolved] = useState(false);
  const comments = manual.comments.filter(comment => comment.pageId === pageId && comment.resolved === resolved);
  return <aside className={styles.comments} aria-label="페이지 댓글"><header><h2>댓글</h2><button type="button" aria-label="댓글 닫기" onClick={onClose}><NavIcon name="close" /></button></header>
    <div className={styles.commentFilters}><button type="button" aria-pressed={!resolved} onClick={() => setResolved(false)}>열린 의견</button><button type="button" aria-pressed={resolved} onClick={() => setResolved(true)}>해결됨</button></div>
    <div className={styles.commentList}>{!comments.length && <p className={styles.muted}>{resolved ? '해결된 의견이 없습니다.' : '설명이 부족하거나 개선할 점을 남겨 주세요.'}</p>}
      {comments.map(comment => <article key={comment.id}><div><strong>{comment.authorName ?? "멤버"}{comment.agentName ? ` · ${comment.agentName}` : ""}</strong><time>{new Date(comment.createdAt).toLocaleDateString('ko-KR')}</time></div><MarkdownView value={comment.body} />
        {manual.canEdit !== false && <button type="button" onClick={() => onSave({ ...manual, comments: manual.comments.map(item => item.id === comment.id ? { ...item, resolved: !item.resolved } : item) })}>{comment.resolved ? '다시 열기' : '해결 처리'}</button>}</article>)}</div>
    {manual.canEdit !== false && <form onSubmit={async event => { event.preventDefault(); if (!body.trim()) return;
      if (await onSave({ ...manual, comments: [...manual.comments, { id: newId(), pageId, body: body.trim(), resolved: false, createdAt: now() }] })) { setBody(''); setResolved(false); }
    }}><MarkdownEditor key={pageId + manual.comments.length} value={body} onChange={setBody} label="개선 의견" placeholder="이 페이지에 대한 의견을 남겨 주세요…" variant="field" minHeight="100px" />
      <Button type="submit" label="댓글 남기기" isDisabled={!body.trim()} /></form>}
  </aside>;
}
