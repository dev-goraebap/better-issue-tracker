import { createElement } from 'react';
import Home01Icon from '@hugeicons/core-free-icons/Home01Icon';
import InboxIcon from '@hugeicons/core-free-icons/InboxIcon';
import CheckListIcon from '@hugeicons/core-free-icons/CheckListIcon';
import UserMultipleIcon from '@hugeicons/core-free-icons/UserMultipleIcon';
import Folder02Icon from '@hugeicons/core-free-icons/Folder02Icon';
import MoreHorizontalIcon from '@hugeicons/core-free-icons/MoreHorizontalIcon';

type IconData = readonly (readonly [string, Readonly<Record<string, string | number>>])[];
const icons: Record<'home' | 'inbox' | 'tasks' | 'members' | 'documents' | 'more', IconData> = {
  home: Home01Icon,
  inbox: InboxIcon,
  tasks: CheckListIcon,
  members: UserMultipleIcon,
  documents: Folder02Icon,
  more: MoreHorizontalIcon,
};

export function NavIcon({ name }: { name: keyof typeof icons }) {
  return <svg className="bit-nav-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
    {icons[name].map(([tag, attributes], index) => createElement(tag, { ...attributes, key: index }))}
  </svg>;
}
