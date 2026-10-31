import { useMemberActions } from '@/features/member-actions';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { MOBILE_QUERY } from '@/shared/config';
import { dateText } from '@/shared/lib/date-text';
import styles from './project-members.module.css';
import { useState } from 'react';
import { Button } from '@astryxdesign/core';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { authError } from '@/shared/api';
import { CompactDialog, DefaultAvatar, FormMessage, ITEM_ROW_LINK, ItemList, ItemMeta, ItemRow, ListToolbar, ListSummary, SheetTable, type SheetColumn, PageFrame, PageState, QueryMessage, Select } from '@/shared/ui';
import { addProjectMember, projectMembershipsQuery } from '@/entities/project';
import { canManage, ROLE_LABELS, useMembers, workspaceQuery, type Member } from '@/entities/workspace';

export function ProjectMembersPage() {
  const { workspaceId, projectId } = useParams({ strict: false }) as { workspaceId: string; projectId: string };
  const memberActions = useMemberActions(workspaceId, projectId);
  const mobile = useMediaQuery(MOBILE_QUERY);
  const client = useQueryClient(); const people = useMembers(workspaceId); const joined = useQuery(projectMembershipsQuery(workspaceId));
  const allowed = canManage(useQuery(workspaceQuery(workspaceId)).data, 'MANAGE_MEMBERS');
  const [query, setQuery] = useState(''); const [adding, setAdding] = useState(false); const [selected, setSelected] = useState<string>(); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const ids = new Set(joined.data?.filter(row => row.projectId === projectId).map(row => row.userId));
  const members = people.items.filter(member => ids.has(member.userId) && (!query || member.name.includes(query) || member.email.includes(query)));
  const save = async () => { if (busy || !selected) return; setBusy(true); setError(''); try { await addProjectMember(workspaceId, projectId, selected); await client.invalidateQueries({ queryKey: projectMembershipsQuery(workspaceId).queryKey }); setAdding(false); setSelected(undefined); } catch (failure) { setError(authError(failure)); } finally { setBusy(false); } };
  const menu = memberActions.menu;
  const columns: SheetColumn<Member>[] = [
    { key: 'person', header: '이름', render: member => <span className={styles.person}><DefaultAvatar seed={member.userId} name={member.name} size={24} /><span><strong>{member.name}</strong><span className={styles.email}>{member.email}</span></span></span> },
    { key: 'role', header: '워크스페이스 역할', width: '12rem', render: member => member.roleName ?? ROLE_LABELS[member.role] },
    { key: 'joined', header: '워크스페이스 참여일', width: '10rem', render: member => dateText(member.joinedAt) },
    { key: 'menu', header: '', width: '3rem', align: 'end', render: menu },
  ];
  const summary = <ListSummary shown={members.length} total={members.length} unit="명" step={members.length} hasMore={false} onMore={() => undefined} />;
  return <PageFrame title="멤버" icon="members" chrome="header"><ListToolbar search={{ label: '멤버 검색', placeholder: '이름이나 이메일로 찾기', value: query, onChange: value => setQuery(value ?? '') }} action={allowed ? { label: '멤버 추가', icon: 'plus', isCreate: true, onClick: () => { setError(''); setAdding(true); } } : undefined} />
    <FormMessage message={error} />{!people.hasData || !joined.data ? <QueryMessage pending={people.isPending || joined.isPending} error={people.error ?? joined.error} retry={() => { void people.refetch(); void joined.refetch(); }} /> : members.length ? mobile ? <><ItemList label="프로젝트 멤버">{members.map(member => <ItemRow key={member.userId} lead={<DefaultAvatar seed={member.userId} name={member.name} size={32} />} title={<span className={ITEM_ROW_LINK}>{member.name}</span>} meta={<><ItemMeta>{member.email}</ItemMeta><ItemMeta>{member.roleName ?? ROLE_LABELS[member.role]}</ItemMeta></>} end={menu(member)} />)}</ItemList>{summary}</> : <SheetTable label="프로젝트 멤버" columns={columns} rows={members} rowKey={member => member.memberId} minWidth="42rem" foot={summary} /> : <PageState title={query ? '조건에 맞는 멤버가 없습니다' : '프로젝트에 참여한 멤버가 없습니다'} description="워크스페이스 멤버 중 이 프로젝트에 참여할 사람을 선택하세요." />}
    {adding && <CompactDialog title="프로젝트 멤버 추가" subtitle="워크스페이스 멤버 중에서 선택합니다. 워크스페이스 역할은 바뀌지 않습니다." onClose={() => setAdding(false)} onSubmit={() => void save()} footer={<><Button label="취소" variant="ghost" onClick={() => setAdding(false)} /><Button label="추가" type="submit" isLoading={busy} isDisabled={!selected} /></>}><FormMessage message={error} />{people.items.some(member => !ids.has(member.userId)) ? <Select label="멤버" value={selected} onChange={setSelected} options={people.items.filter(member => !ids.has(member.userId)).map(member => ({ value: member.userId, label: `${member.name} · ${member.email}` }))} /> : <p>추가할 멤버가 없습니다. 워크스페이스 멤버 관리에서 구성원을 확인하세요.</p>}</CompactDialog>}
    {memberActions.dialogs}
  </PageFrame>;
}
