import { useEffect, useId, useState } from 'react';
import { Button, IconButton } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { BackLink, FormMessage, NavIcon, PageFoot, PageFrame, PageState } from '@/shared/ui';
import { canManage, createInvitation, refreshWorkspace, ROLE_LABELS, workspaceQuery } from '@/entities/workspace';
import { emptyRow, linksText, MAX_ROWS, pasteInto, validateRows, type InviteResult, type InviteRole, type InviteRow } from '../model/rows';
import { InviteRowFields } from './InviteRowFields';
import styles from './invite.module.css';

/**
 * 구성원 초대 at /workspaces/$workspaceId/members/invite, as 호호 HR's 사원 등록 (D-079): a row per person, its email and role
 * (the owner may invite admins; an admin members and viewers), 행 추가 under them, and 'N명 초대' in the page's foot.
 * Several addresses pasted into one email (a column from a sheet, a list from a message) fill a row each. Each
 * invitation is a one-time link lasting seven days, shown once on the page that follows: a row per person with its
 * link to copy, 링크 모두 복사 for every one as 'email<TAB>link', and the refused ones to try again. Leaving the page
 * hides the links.
 */
export function InvitePage() {
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };
  const client = useQueryClient();
  const workspace = useQuery(workspaceQuery(workspaceId)).data;
  const formId = useId();
  const [rows, setRows] = useState<InviteRow[]>(() => [emptyRow()]);
  const [errors, setErrors] = useState<Map<string, string> | null>(null);
  const [results, setResults] = useState<InviteResult[] | null>(null);
  const [isBusy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const clear = () => setResults(null);
    window.addEventListener('pagehide', clear);
    return () => window.removeEventListener('pagehide', clear);
  }, []);
  const back = <BackLink to="/workspaces/$workspaceId/members" params={{ workspaceId }} search={{ view: 'invitations' }} label="구성원" />;
  if (workspace && !canManage(workspace.myRole)) return <PageFrame title="구성원 초대" back={back} width="narrow">
    <PageState kind="not-found" title="초대할 수 없습니다" description="워크스페이스의 소유자와 관리자만 구성원을 초대합니다." />
  </PageFrame>;
  const roles: InviteRole[] = workspace?.myRole === 'owner' ? ['admin', 'member', 'viewer'] : ['member', 'viewer'];
  const filled = rows.filter(row => row.email.trim());
  const update = (next: InviteRow[]) => { setRows(next); if (errors) setErrors(validateRows(next)); };
  const invite = async () => {
    const found = validateRows(rows);
    setErrors(found);
    if (found.size > 0 || isBusy) return;
    setBusy(true); setNotice('');
    const made: InviteResult[] = [];
    // One after another, so a refusal names its row and the rest still go.
    for (const row of filled) {
      try {
        const created = await createInvitation(workspaceId, row.email.trim(), row.role);
        made.push({ ...row, email: row.email.trim(), link: `${window.location.origin}/join#token=${encodeURIComponent(created.token)}` });
      } catch (failure) { made.push({ ...row, email: row.email.trim(), error: authError(failure) }); }
    }
    setResults(made); setBusy(false);
    await refreshWorkspace(client, workspaceId);
  };
  const copy = async (text: string, done: string) => {
    try { await navigator.clipboard.writeText(text); setNotice(done); }
    catch { setNotice('복사하지 못했습니다. 링크를 직접 선택해 복사하세요.'); }
  };
  if (results) {
    const made = results.filter(result => result.link);
    const refused = results.filter(result => result.error);
    return <PageFrame title="초대 링크" back={back} width="default">
      <p className={styles.lead}>링크는 지금 한 번만 보입니다. 7일 동안 한 번 쓸 수 있으니 각자에게 전달하세요.</p>
      <ol className={styles.results} aria-label="초대 결과">{results.map(result => <li key={result.key} className={styles.result} data-refused={result.error ? '' : undefined}>
        <span className={styles.resultEmail}>{result.email}</span>
        <span className={styles.resultRole}>{ROLE_LABELS[result.role]}</span>
        {result.link
          ? <><code className={styles.link}>{result.link}</code>
            <IconButton label={`${result.email} 링크 복사`} tooltip="링크 복사" icon={<NavIcon name="copy" />} variant="ghost" size="sm"
              onClick={() => { void copy(result.link!, `${result.email}의 링크를 복사했습니다.`); }} /></>
          : <span className={styles.refusal}>{result.error}</span>}
      </li>)}</ol>
      <FormMessage message={notice} isError={false} />
      <PageFoot start={<span className={styles.count}>{made.length}명 초대{refused.length ? ` · ${refused.length}명 실패` : ''}</span>}>
        {refused.length > 0 && <Button label="실패한 행 다시 입력" variant="secondary"
          onClick={() => { setRows(refused.map(result => ({ key: result.key, email: result.email, role: result.role }))); setErrors(null); setResults(null); setNotice(''); }} />}
        {made.length > 0 && <Button label="링크 모두 복사" variant="primary" onClick={() => { void copy(linksText(results), `${made.length}명의 링크를 복사했습니다.`); }} />}
      </PageFoot>
    </PageFrame>;
  }
  return <PageFrame title="구성원 초대" back={back} width="default">
    <form id={formId} noValidate onSubmit={event => { event.preventDefault(); void invite(); }}>
      <div className={styles.header} aria-hidden="true"><span>#</span><span>이메일</span><span>역할</span><span /></div>
      <ol className={styles.rows} aria-label="초대할 사람">
        {rows.map((row, index) => <InviteRowFields key={row.key} row={row} index={index} roles={roles} error={errors?.get(row.key)} isDisabled={isBusy}
          canRemove={rows.length > 1}
          onChange={patch => update(rows.map(item => (item.key === row.key ? { ...item, ...patch } : item)))}
          onPaste={text => { const next = pasteInto(rows, row.key, text); if (next) update(next); return !!next; }}
          onRemove={() => update(rows.filter(item => item.key !== row.key))} />)}
      </ol>
      <div className={styles.more}>
        <Button label="행 추가" variant="secondary" icon={<NavIcon name="plus" />} isDisabled={isBusy || rows.length >= MAX_ROWS}
          onClick={() => update([...rows, emptyRow(rows.at(-1)?.role)])} />
        <span className={styles.hint}>이메일 여러 개를 한 칸에 붙여 넣으면 한 줄씩 나뉩니다.</span>
      </div>
    </form>
    <PageFoot start={<span className={styles.count}>{filled.length}명 · 한 번에 최대 {MAX_ROWS}명까지 초대합니다</span>}>
      <Button type="submit" form={formId} label={filled.length > 0 ? `${filled.length}명 초대` : '초대'} variant="primary" isLoading={isBusy} />
    </PageFoot>
  </PageFrame>;
}
