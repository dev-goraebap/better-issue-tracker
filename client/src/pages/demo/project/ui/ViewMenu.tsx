import { DropdownMenu } from '@astryxdesign/core';
import { NavIcon } from '@/shared/ui';

export type ViewChoice<T extends string> = { value: T; label: string; keys?: string };

/**
 * The calendar's view (월·주·업무 주) behind one … button, a menu opening below it from its start (the button sits after
 * the period's title); the view in force is ticked, and its name is the button's label for screen readers.
 */
export function ViewMenu<T extends string>({ value, choices, onChange }: {
  value: T; choices: readonly ViewChoice<T>[]; onChange: (value: T) => void;
}) {
  const current = choices.find(choice => choice.value === value)?.label ?? '';
  const label = `보기: ${current}`;
  return <DropdownMenu button={{ label, tooltip: label, variant: 'ghost', isIconOnly: true, icon: <NavIcon name="more" /> }}
    alignment="start" menuWidth={180}
    items={choices.map(choice => ({
      label: choice.keys ? `${choice.label} (${choice.keys})` : choice.label, onClick: () => onChange(choice.value),
      endContent: choice.value === value ? <NavIcon name="done" /> : undefined,
    }))} />;
}
