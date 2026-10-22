import { ArrowLeftRight, Ellipsis, Folder, House, Inbox, ListTodo, PanelLeft, Settings, Users, X } from 'lucide-react';

const icons = {
  home: House,
  inbox: Inbox,
  tasks: ListTodo,
  members: Users,
  documents: Folder,
  more: Ellipsis,
  sidebar: PanelLeft,
  close: X,
  settings: Settings,
  switcher: ArrowLeftRight,
};

export function NavIcon({ name }: { name: keyof typeof icons }) {
  const Icon = icons[name];
  return <Icon className="bit-nav-icon" size={20} strokeWidth={1.75} aria-hidden="true" focusable="false" />;
}
