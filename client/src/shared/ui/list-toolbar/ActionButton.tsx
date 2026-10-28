import { Button, DropdownMenu } from '@astryxdesign/core';
import { NavIcon } from '../NavIcon';
import type { ListAction } from './ListToolbar';

/** A list's main action as its button, or, with choices, as a menu of what to make (만들기 ▾, D-092). */
export function ActionButton({ action, size }: { action: ListAction; size?: 'sm' }) {
  const variant = action.isCreate ? 'primary' : 'secondary';
  const icon = <NavIcon name={action.icon ?? 'plus'} />;
  const className = action.isCreate ? 'bit-create-action' : undefined;
  if (!action.choices?.length) return <Button label={action.label} variant={variant} size={size} icon={icon} onClick={action.onClick} className={className} />;
  return <DropdownMenu button={{ label: action.label, variant, size, icon, className, endContent: <NavIcon name="chevron-down" /> }} alignment="end" menuWidth={160}
    items={action.choices.map(choice => ({ label: choice.label, icon: choice.mark ?? (choice.icon ? <NavIcon name={choice.icon} /> : undefined), onClick: choice.onClick }))} />;
}
