import { DropdownMenu } from '@astryxdesign/core';
import { NavIcon } from '../NavIcon';
import type { ListOption } from './ListToolbar';

/** A desktop's list order in the card's header row: the sort icon in a box, its menu ticking the order in force. */
export function SortMenuButton({ sort }: { sort: { value: string; options: ListOption[]; onChange: (value: string) => void } }) {
  const current = sort.options.find(option => option.value === sort.value)?.label ?? '정렬';
  return <DropdownMenu button={{ label: `정렬: ${current}`, tooltip: `정렬: ${current}`, variant: 'ghost', isIconOnly: true, icon: <NavIcon name="display" /> }}
    alignment="end" menuWidth={200}
    items={sort.options.map(option => ({
      label: option.label, onClick: () => sort.onChange(option.value),
      endContent: option.value === sort.value ? <NavIcon name="done" /> : undefined,
    }))} />;
}
