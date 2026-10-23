import { CheckboxInput } from '@astryxdesign/core';
import { useState, type ReactNode } from 'react';
import { NavIcon } from '../NavIcon';
import styles from './header-tools.module.css';

type Option = { value: string; label: string; icon?: ReactNode };

/**
 * A menu's options with a search box over them, in small type. Several to choose (isMultiple) are checkboxes; one to
 * choose is a row with a tick at its end once chosen; a plain menu (no chosen) is rows alone. size lg gives a phone's
 * touch rows (44px, 14px type), the checkbox at its own size.
 */
export function OptionList({ label, options, chosen, isMultiple, onPick, size = 'sm' }: {
  label: string; options: Option[]; chosen?: string[]; isMultiple?: boolean; onPick: (value: string) => void; size?: 'sm' | 'lg';
}) {
  const [words, setWords] = useState('');
  const needle = words.trim().toLowerCase();
  const found = options.filter(option => !needle || option.label.toLowerCase().includes(needle));
  const content = (option: Option) => <>
    {option.icon && <span className={styles.optionIcon}>{option.icon}</span>}
    <span className={styles.optionLabel}>{option.label}</span>
  </>;
  return <div className={styles.menuBody} data-size={size}>
    <label className={styles.menuSearch}>
      <NavIcon name="search" />
      <input aria-label={label} placeholder="찾기" value={words} onChange={event => setWords(event.target.value)} autoFocus />
    </label>
    <div role={isMultiple ? 'group' : chosen ? 'listbox' : 'menu'} aria-label={label}>
      {found.length === 0 && <p className={styles.note}>찾은 것이 없습니다</p>}
      {found.map(option => {
        const isOn = chosen?.includes(option.value) ?? false;
        // The whole row toggles the checkbox; the checkbox itself answers its own press.
        if (isMultiple) return <div key={option.value} className={styles.option}
          onClick={event => { if (!(event.target as HTMLElement).closest('input, label')) onPick(option.value); }}>
          <span className={styles.optionCheck}><CheckboxInput label={option.label} isLabelHidden size={size === 'lg' ? 'md' : 'sm'} value={isOn} onChange={() => onPick(option.value)} /></span>
          {content(option)}
        </div>;
        return <button key={option.value} type="button" role={chosen ? 'option' : 'menuitem'} aria-selected={chosen ? isOn : undefined}
          className={styles.option} onClick={() => onPick(option.value)}>
          {content(option)}
          {isOn && <span className={styles.optionTick}><NavIcon name="check" /></span>}
        </button>;
      })}
    </div>
  </div>;
}
