import type { Space, Role } from '../api/workspace';

/** The four roles by their Korean names (D-040, D-048, D-049), the least first. */
export const ROLES: readonly Role[] = ['viewer', 'member', 'admin', 'owner'];
export const ROLE_LABELS: Record<Role, string> = { owner: '소유자', admin: '관리자', member: '멤버', viewer: '보기 전용' };
/** Server-provided effective permissions take precedence over the four built-in fallback roles. */
export const canWrite = (subject?: Role | Space, action = 'WRITE_WORK'): boolean => {
  if (typeof subject === 'object') return subject.permissions ? subject.permissions.includes(action) : canWrite(subject.myRole, action);
  return subject === 'owner' || subject === 'admin' || subject === 'member';
};
export const canManage = (subject?: Role | Space, action = 'EDIT_SETTINGS'): boolean => {
  if (typeof subject === 'object') return subject.permissions ? subject.permissions.includes(action) : canManage(subject.myRole, action);
  return subject === 'owner' || subject === 'admin';
};
