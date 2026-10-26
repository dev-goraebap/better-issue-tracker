/**
 * The colours a member picks for a mark (a view's, a project's) or a label, in hue order with the greys first: two rows of
 * eight in the picker. The first eight of before keep their values, so marks and labels already made keep their colour.
 */
export const PALETTE: readonly { value: string; name: string }[] = [
  { value: '#95959f', name: '회색' }, { value: '#6e7481', name: '진회색' }, { value: '#b07d56', name: '갈색' }, { value: '#c2a477', name: '모래' },
  { value: '#eb5757', name: '빨강' }, { value: '#f06595', name: '분홍' }, { value: '#f2994a', name: '주황' }, { value: '#f2c94c', name: '노랑' },
  { value: '#94c847', name: '연두' }, { value: '#4cb782', name: '초록' }, { value: '#20b2a0', name: '청록' }, { value: '#26b5ce', name: '하늘' },
  { value: '#4a90e2', name: '파랑' }, { value: '#5e6ad2', name: '남색' }, { value: '#bb87fc', name: '보라' }, { value: '#d660c8', name: '자홍' },
];
/** The colour a new view or label starts with. */
export const DEFAULT_MARK_COLOR = '#5e6ad2';

/** The icons a member picks for a view's or a project's mark, beside a colour from the palette (NavIcon names). */
export const MARK_ICONS: readonly string[] = [
  'list', 'rows', 'board', 'calendar', 'milestone', 'decision', 'session', 'members', 'person', 'priority', 'label', 'agent',
  'documents', 'branch', 'workflow', 'tasks', 'shield', 'home',
];
