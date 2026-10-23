import { BottomSheet, Text, TextInput, type IconType, type SelectorOptionData, type SelectorOptionType, type SelectorProps } from '@astryxdesign/core';
import { createElement, isValidElement, useState, type ReactNode } from 'react';
import { NavIcon } from '../NavIcon';
import { SheetList, type SheetChoice, type SheetGroup } from './SheetList';
import styles from './select.module.css';

/** A selector's options as the sheet's groups: loose options in one untitled group, each section its own, dividers splitting groups. */
function groupsOf(options: readonly SelectorOptionType[], renderOption?: SelectorProps['renderOption']): SheetGroup[] {
  const choiceOf = (option: SelectorOptionData): SheetChoice => ({
    value: option.value, label: renderOption ? renderOption(option) : option.label ?? option.value,
    description: renderOption ? undefined : option.description, icon: renderOption ? undefined : iconOf(option.icon), isDisabled: option.disabled,
  });
  const groups: SheetGroup[] = [{ choices: [] }];
  for (const option of options) {
    if (typeof option === 'string') groups.at(-1)!.choices.push({ value: option, label: option });
    else if ('type' in option && option.type === 'divider') groups.push({ choices: [] });
    else if ('type' in option && option.type === 'section') groups.push({ title: option.title, choices: option.options.map(choiceOf) }, { choices: [] });
    else groups.at(-1)!.choices.push(choiceOf(option as SelectorOptionData));
  }
  return groups.filter(group => group.choices.length);
}

/** An option's icon as something to draw: a node as it is, an icon component drawn at the list's 20px. */
const iconOf = (icon: SelectorOptionData['icon']) =>
  (typeof icon === 'function' || (typeof icon === 'object' && icon !== null && !isValidElement(icon) && '$$typeof' in icon)
    ? createElement(icon as IconType, { width: 20, height: 20, 'aria-hidden': true }) : icon as ReactNode);

/** The label the box shows for a value, found among loose and sectioned options. */
function labelOf(options: readonly SelectorOptionType[], value: string | null | undefined): string {
  if (value == null) return '';
  for (const option of options) {
    if (typeof option === 'string') { if (option === value) return option; continue; }
    if ('type' in option && option.type === 'section') {
      const found = option.options.find(inner => inner.value === value);
      if (found) return found.label ?? found.value;
    } else if (!('type' in option) && option.value === value) return option.label ?? option.value;
  }
  return '';
}

/**
 * Select on a phone: the field's box, read-only so the keyboard never rises, opening its options in a bottom sheet
 * (with a search box over them when the selector would have one). Picking closes it; Escape, a swipe or the scrim close
 * it without a change, and focus returns to the box. A clearable one offers its placeholder ('태그 없음', say) first.
 */
export function SheetSelect<T extends SelectorOptionType>(props: SelectorProps<T>) {
  const { label, isLabelHidden, description, isOptional, isRequired, isDisabled, isLoading, options, placeholder, status, width, startIcon,
    renderOption, hasSearch, searchPlaceholder, emptyText, emptySearchText, value } = props;
  const [isOpen, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const pick = (next: string | null) => {
    setOpen(false);
    if (next === value) return;
    if (props.hasClear) props.onChange?.(next);
    else if (next !== null) props.onChange?.(next);
  };
  const words = query.trim().toLowerCase();
  const all: readonly SelectorOptionType[] = options;
  const narrowed = words
    ? all.filter(option => typeof option === 'string' ? option.toLowerCase().includes(words)
      : 'type' in option ? option.type === 'section' : (option.label ?? option.value).toLowerCase().includes(words))
      .map(option => typeof option !== 'string' && 'type' in option && option.type === 'section'
        ? { ...option, options: option.options.filter(inner => (inner.label ?? inner.value).toLowerCase().includes(words)) } : option)
    : all;
  const clearRow: SheetGroup[] = props.hasClear && value != null && !words ? [{ choices: [{ value: CLEAR, label: placeholder ?? '선택 안 함' }] }] : [];
  const open = () => { if (!isDisabled && !isLoading) { setQuery(''); setOpen(true); } };
  return <div className={styles.field} style={{ width: typeof width === 'number' ? `${width}px` : width }}>
    <TextInput label={label} isLabelHidden={isLabelHidden} description={description} isOptional={isOptional} isRequired={isRequired}
      value={isLoading ? '불러오는 중' : labelOf(options, value)} placeholder={placeholder} isReadOnly isDisabled={isDisabled} status={status}
      startIcon={startIcon}
      role="combobox" aria-haspopup="dialog" aria-expanded={isOpen} onClick={open}
      onKeyDown={event => { if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); open(); } }} />
    <BottomSheet isOpen={isOpen} onOpenChange={setOpen} label={`${label} 고르기`} height={hasSearch ? 'tall' : 'hug'}>
      {isOpen && <div className={styles.sheet}>
        <Text type="label" className={styles.sheetTitle}>{label}</Text>
        {hasSearch && <div className={styles.search}>
          <TextInput label={`${label} 찾기`} isLabelHidden size="lg" value={query} onChange={setQuery} placeholder={searchPlaceholder ?? `${label} 찾기`}
            startIcon={<NavIcon name="search" />} hasClear />
        </div>}
        <SheetList label={label} groups={[...clearRow, ...groupsOf(narrowed, renderOption)]} value={value ?? (props.hasClear ? CLEAR : null)}
          onPick={next => pick(next === CLEAR ? null : next)} isFocused={!hasSearch}
          empty={words ? emptySearchText ?? '찾는 항목이 없습니다' : emptyText ?? '고를 항목이 없습니다'} />
      </div>}
    </BottomSheet>
  </div>;
}

/** The row that clears a clearable select; no option's value. */
const CLEAR = '\u0000clear';
