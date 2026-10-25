/** The colours a member picks for a view or a label, as Linear's: a few clear hues and a grey, each with its name. */
export const PALETTE: readonly { value: string; name: string }[] = [
  { value: '#95959f', name: '회색' }, { value: '#5e6ad2', name: '남색' }, { value: '#26b5ce', name: '청록' }, { value: '#4cb782', name: '초록' },
  { value: '#f2c94c', name: '노랑' }, { value: '#f2994a', name: '주황' }, { value: '#eb5757', name: '빨강' }, { value: '#bb87fc', name: '보라' },
];

/** The icons a member picks for a view's or a project's mark, beside a colour from the palette (NavIcon names). */
export const MARK_ICONS: readonly string[] = [
  'list', 'rows', 'board', 'calendar', 'milestone', 'decision', 'session', 'members', 'person', 'priority', 'label', 'agent',
  'documents', 'branch', 'workflow', 'tasks', 'shield', 'home',
];
