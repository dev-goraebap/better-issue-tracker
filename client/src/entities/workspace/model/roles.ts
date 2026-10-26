import type { Role } from '../api/workspace';

/** The four roles by their Korean names (D-040, D-048, D-049), the least first. */
export const ROLES: readonly Role[] = ['viewer', 'member', 'admin', 'owner'];
export const ROLE_LABELS: Record<Role, string> = { owner: '소유자', admin: '관리자', member: '멤버', viewer: '보기 전용' };
/** Whether a role makes and changes the workspace's work (work items, labels, views): everyone but a viewer. */
export const canWrite = (role?: Role) => role === 'owner' || role === 'admin' || role === 'member';
/** Whether a role runs the workspace: its settings, projects' settings, members and invitations. */
export const canManage = (role?: Role) => role === 'owner' || role === 'admin';
