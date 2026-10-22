export const WORKSPACE_NAVIGATION = [
  { path: '/', label: '홈', icon: 'home' },
  { path: '/inbox', label: 'Inbox', icon: 'inbox' },
  { path: '/my-tasks', label: 'My Tasks', icon: 'tasks' },
  { path: '/members', label: 'Members', icon: 'members' },
  { path: '/documents', label: '문서함', icon: 'documents' },
] as const;

export const MOBILE_TAB_PATHS: readonly string[] = ['/', '/inbox', '/my-tasks'];
