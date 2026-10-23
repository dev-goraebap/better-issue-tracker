import { useCallback, useId, useMemo, useState } from 'react';
import { MoreMenu } from '@astryxdesign/core';
import { useMediaQuery } from '@astryxdesign/core/hooks';
import { useNavigate, useParams, useSearch } from '@tanstack/react-router';
import { MOBILE_QUERY } from '@/shared/config';
import { DefaultAvatar, ItemList, ItemMeta, ItemRow, ListToolbar, NavIcon, PageFrame, PageState, PageTabs, Select, SheetTable, StatusToken, type PageTab, type SheetColumn } from '@/shared/ui';
import { dateText, demoStyles, INVITATIONS, PEOPLE, personOf, ROLE_LABELS, type Invitation, type MembersSearch, type Person, type Role } from '@/entities/demo-sample';

type Tab = 'members' | 'invitations';
const TABS: PageTab<Tab>[] = [{ value: 'members', label: '멤버', icon: 'members' }, { value: 'invitations', label: '초대', icon: 'mail' }];
const ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[]).map(role => ({ value: role, label: ROLE_LABELS[role] }));

/**
 * PATTERN · 탭마다 다른 표, /demo/w/$workspaceId/members (as the real /members?view=invitations). Copy this page when one
 * menu holds a few lists of different shapes.
 *
 * - The tab is the URL's view (멤버 left out); each tab has its own columns and its own action (초대 탭: 멤버 초대).
 * - A row's control (역할 선택, 행 메뉴) sits in its cell; pressing it never opens the row.
 * - A phone shows the same rows as cards with the picture as the lead.
 */
export function DemoMembersPage() {
  const { workspaceId } = useParams({ from: '/demo/w/$workspaceId/members' });
  const search = useSearch({ from: '/demo/w/$workspaceId/members' });
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const navigate = useNavigate();
  const panelId = useId();
  const tab: Tab = search.view ?? 'members';
  const [roles, setRoles] = useState<Record<string, Role>>(() => Object.fromEntries(PEOPLE.filter(person => person.role).map(person => [person.id, person.role as Role])));
  const go = useCallback((patch: Partial<MembersSearch>, replace = false) => void navigate({
    to: '/demo/w/$workspaceId/members', params: { workspaceId }, replace,
    search: previous => Object.fromEntries(Object.entries({ ...previous, ...patch }).filter(([, value]) => value !== undefined)),
  }), [navigate, workspaceId]);
  const members = useMemo(() => PEOPLE.filter(person => person.kind === 'user')
    .filter(person => !search.q || person.name.includes(search.q) || person.email?.includes(search.q)), [search.q]);
  const roleSelect = (person: Person) => <Select label={`${person.name} 역할`} isLabelHidden size="sm" options={ROLE_OPTIONS} value={roles[person.id]}
    onChange={value => setRoles({ ...roles, [person.id]: (value ?? 'member') as Role })} />;
  // Built each render: the role cell reads the roles in state.
  const memberColumns: SheetColumn<Person>[] = [
    { key: 'name', header: '이름', render: row => <><DefaultAvatar seed={row.id} name={row.name} size={20} /><span className={demoStyles.clip}>{row.name}</span></> },
    { key: 'email', header: '이메일', width: '16rem', render: row => <span className={demoStyles.clip}>{row.email}</span> },
    { key: 'role', header: '역할', width: '10rem', render: roleSelect },
  ];
  const inviteColumns = useMemo<SheetColumn<Invitation>[]>(() => [
    { key: 'email', header: '이메일', render: row => <span className={demoStyles.clip}>{row.email}</span> },
    { key: 'role', header: '역할', width: '7rem', render: row => ROLE_LABELS[row.role] },
    { key: 'by', header: '보낸 사람', width: '8rem', render: row => personOf(row.invitedById)?.name },
    { key: 'status', header: '상태', width: '6rem', render: row => <StatusToken label={row.status === 'pending' ? '대기' : '만료'} color={row.status === 'pending' ? 'blue' : 'gray'} /> },
    { key: 'expires', header: '만료일', width: '7rem', render: row => dateText(row.expiresAt) },
    { key: 'menu', header: '', width: '3.5rem', align: 'end', render: row => <MoreMenu label={`${row.email} 초대 메뉴`} variant="ghost" size="sm" placement="end" items={[
      { label: '다시 보내기', icon: <NavIcon name="mail" />, onClick: () => undefined },
      { label: '초대 취소', icon: <NavIcon name="delete" />, onClick: () => undefined },
    ]} /> },
  ], []);
  return <PageFrame title="Members" icon="members" chrome="header"
    tabs={<PageTabs value={tab} items={TABS} panelId={panelId} onChange={next => go({ view: next === 'members' ? undefined : 'invitations' })} />}>
    <ListToolbar search={tab === 'members' ? { label: '멤버 검색', placeholder: '이름이나 이메일로 찾기', value: search.q, onChange: q => go({ q }, true) } : undefined}
      label="초대 조건" action={tab === 'invitations' ? { label: '멤버 초대', icon: 'plus', onClick: () => undefined, isCreate: true } : undefined} />
    <div role="tabpanel" id={panelId}>
      {tab === 'members' && (members.length === 0
        ? <PageState kind="search" title={`'${search.q}'에 맞는 멤버가 없습니다`} description="다른 이름이나 이메일로 찾아보세요." />
        : isMobile
          ? <ItemList label="멤버">{members.map(person => <ItemRow key={person.id} lead={<DefaultAvatar seed={person.id} name={person.name} size={32} />} title={person.name}
            meta={<><ItemMeta>{person.email}</ItemMeta><ItemMeta>{ROLE_LABELS[roles[person.id]]}</ItemMeta></>} />)}</ItemList>
          : <SheetTable label="멤버" columns={memberColumns} rows={members} rowKey={row => row.id} minWidth="40rem" />)}
      {tab === 'invitations' && (isMobile
        ? <ItemList label="초대">{INVITATIONS.map(invite => <ItemRow key={invite.id} title={invite.email}
          meta={<><ItemMeta>{ROLE_LABELS[invite.role]}</ItemMeta><ItemMeta><StatusToken label={invite.status === 'pending' ? '대기' : '만료'} color={invite.status === 'pending' ? 'blue' : 'gray'} /></ItemMeta><ItemMeta>{dateText(invite.expiresAt)}</ItemMeta></>} />)}</ItemList>
        : <SheetTable label="초대" columns={inviteColumns} rows={INVITATIONS} rowKey={row => row.id} minWidth="44rem" />)}
    </div>
  </PageFrame>;
}
