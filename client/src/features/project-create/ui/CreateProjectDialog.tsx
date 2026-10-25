import { useState, type KeyboardEvent } from 'react';
import { Button, IconButton } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, authError } from '@/shared/api';
import { FormMessage, MarkPicker, NavIcon, PanelDialog, type Mark } from '@/shared/ui';
import { createProject, PROJECT_KEY as KEY, refreshProjects } from '@/entities/project';
import { WorkspaceMark, workspaceQuery } from '@/entities/workspace';
import styles from './create-project.module.css';

/** A key offered from the name: its Latin letters and digits, upper case, up to four; else nothing to offer. */
const keyFrom = (name: string) => name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
/** The mark a new project starts with, changed in its picker as a view's is. */
const FIRST_MARK: Mark = { icon: 'board', color: '#5e6ad2' };

/**
 * A new project as Linear's (the new issue's quick form, D-070): the workspace › 새 프로젝트 with close at the head;
 * then the project's mark (an icon and a colour, picked as a view's) and its name in large type without a box; a pill
 * holding its key, offered from the name until typed (2–10 Latin capitals and digits, not one the workspace has had,
 * said under the pills on submit); under a hairline its description, room to write that grows with it; and the create
 * button at the foot. Ctrl + Enter creates from anywhere in it. The member lands on the new project's page.
 */
export function CreateProjectDialog({ workspaceId, isOpen, onClose, onCreated }: { workspaceId: string; isOpen: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const client = useQueryClient();
  const workspace = useQuery(workspaceQuery(workspaceId)).data;
  const [mark, setMark] = useState(FIRST_MARK);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [key, setKey] = useState('');
  const [isKeyTyped, setKeyTyped] = useState(false);
  const [isChecked, setChecked] = useState(false);
  const [isBusy, setBusy] = useState(false);
  const [takenKey, setTakenKey] = useState('');
  const [error, setError] = useState('');
  const shownKey = isKeyTyped ? key : keyFrom(name);
  const problem = !isChecked ? '' : !name.trim() ? '프로젝트 이름을 입력해 주세요.' : !shownKey ? '프로젝트 키를 입력해 주세요.'
    : !KEY.test(shownKey) ? '키는 영문 대문자·숫자 2~10자로 적어 주세요.' : shownKey === takenKey ? '이 워크스페이스에서 이미 쓴 키입니다.' : '';
  const reset = () => { setMark(FIRST_MARK); setName(''); setDescription(''); setKey(''); setKeyTyped(false); setChecked(false); setTakenKey(''); setError(''); };
  const close = () => { if (isBusy) return; reset(); onClose(); };
  const submit = async () => {
    setChecked(true);
    if (!name.trim() || !KEY.test(shownKey) || shownKey === takenKey || isBusy) return;
    setBusy(true); setError('');
    try {
      const id = await createProject(workspaceId, { name: name.trim(), key: shownKey, description: description.trim() || null, icon: mark.icon, color: mark.color });
      await refreshProjects(client, workspaceId);
      reset(); onCreated(id);
    } catch (failure) {
      if (failure instanceof ApiError && failure.code === 'PROJECT_KEY_CONFLICT') setTakenKey(shownKey);
      else setError(authError(failure));
    } finally { setBusy(false); }
  };
  const keys = (event: KeyboardEvent) => { if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) { event.preventDefault(); void submit(); } };
  if (!isOpen) return null;
  return <PanelDialog label="새 프로젝트" size="form" onClose={close}>
    <form className={styles.dialog} onKeyDown={keys} onSubmit={event => { event.preventDefault(); void submit(); }}>
      <header className={styles.head}>
        {workspace && <span className={styles.chip}><WorkspaceMark workspace={workspace} size="sm" />{workspace.name}</span>}
        <NavIcon name="forward" />
        <h2 className={styles.headTitle}>새 프로젝트</h2>
        <span className={styles.headEnd}><IconButton label="닫기" tooltip="닫기 (Esc)" variant="ghost" size="sm" icon={<NavIcon name="close" />} onClick={close} /></span>
      </header>
      <div className={styles.body}>
        <MarkPicker value={mark} label="프로젝트 아이콘과 색 고르기" isDisabled={isBusy} onChange={setMark} />
        <input className={styles.name} value={name} placeholder="프로젝트 이름" aria-label="프로젝트 이름" aria-required="true" data-autofocus disabled={isBusy}
          onChange={event => setName(event.target.value)} />
        <div className={styles.pills} role="group" aria-label="속성">
          <label className={styles.pill} title={`이슈 번호가 ${shownKey || 'APP'}-1처럼 붙습니다.`}>
            <NavIcon name="key" />
            <input className={styles.key} value={shownKey} placeholder="키" aria-label="프로젝트 키" disabled={isBusy} size={Math.max(3, shownKey.length)}
              onChange={event => { setKeyTyped(true); setKey(event.target.value.toUpperCase()); }} />
          </label>
          <span className={styles.hint}>이슈 번호가 {shownKey || 'APP'}-1처럼 붙습니다.</span>
        </div>
        <FormMessage message={problem || error} />
        <textarea className={styles.description} value={description} placeholder="이 프로젝트가 하는 일, 목표, 모아 둘 생각을 적어 보세요…" aria-label="설명"
          maxLength={20000} disabled={isBusy} onChange={event => setDescription(event.target.value)} />
      </div>
      <footer className={styles.foot}>
        <Button label="취소" variant="ghost" size="sm" onClick={close} isDisabled={isBusy} />
        <Button type="submit" label="프로젝트 만들기" variant="primary" size="sm" isLoading={isBusy} tooltip="Ctrl + Enter" />
      </footer>
    </form>
  </PanelDialog>;
}
