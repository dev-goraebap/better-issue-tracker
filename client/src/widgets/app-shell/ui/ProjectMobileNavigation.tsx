import { useState } from 'react';
import { BottomSheet, Heading, Text, VStack } from '@astryxdesign/core';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import type { Space } from '@/entities/workspace';
import { AccountMenu } from '@/features/account-menu';
import { emptyTaskSearch } from '@/features/work-item-filters';
import { afterOverlayClose } from '@/shared/lib/back-close';
import { NavIcon } from '@/shared/ui';
import styles from './app-shell.module.css';

export function ProjectMobileNavigation({ pathname, workspace, projectId }: { pathname: string; workspace: Space; projectId: string }) {
  const [open, setOpen] = useState(false); const navigate = useNavigate(); const search = useSearch({ strict: false });
  const base = `/w/${workspace.id}/p/${projectId}`;
  const links = [{ label: '일정', path: `${base}?view=timeline` }, { label: '프로젝트 설정', path: `${base}/settings` }, { label: '워크스페이스 홈', path: `/w/${workspace.id}` }, { label: '모든 프로젝트', path: `/w/${workspace.id}/projects` }, { label: '공간 선택 · 전환', path: '/workspaces' }];
  return <><nav className={styles.mobileNavigation} aria-label="프로젝트 메뉴">
    {([['board', '보드', 'documents'], ['list', '목록', 'tasks'], ['backlog', '백로그', 'inbox']] as const).map(([view, label, icon]) => <Link key={view} to="/w/$workspaceId/p/$projectId" params={{ workspaceId: workspace.id, projectId }} search={{ ...emptyTaskSearch(), ...search, view }} className={styles.tab} aria-current={pathname === base && (search.view ?? 'board') === view ? 'page' : undefined}><NavIcon name={icon} /><Text type="supporting" color="inherit">{label}</Text></Link>)}
    <button type="button" className={styles.tab} aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen(true)}><NavIcon name="more" /><Text type="supporting" color="inherit">더보기</Text></button>
  </nav><BottomSheet isOpen={open} onOpenChange={setOpen} label="프로젝트 더보기" height="hug"><VStack gap={4} padding={6}><Heading level={2}>더보기</Heading><Text type="supporting">{workspace.name}</Text><nav className={styles.moreNavigation} aria-label="프로젝트 추가 메뉴">{links.map(link => <a key={link.path} href={link.path} className={styles.moreLink} onClick={event => { if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return; event.preventDefault(); setOpen(false); afterOverlayClose(() => { void navigate({ href: link.path }); }); }}>{link.label}</a>)}</nav><AccountMenu onNavigate={path => { setOpen(false); afterOverlayClose(() => { void navigate({ to: path }); }); }} /></VStack></BottomSheet></>;
}
