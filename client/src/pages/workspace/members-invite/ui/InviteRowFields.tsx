import { IconButton, TextInput } from '@astryxdesign/core';
import { NavIcon, Select } from '@/shared/ui';
import { ROLE_LABELS } from '@/entities/workspace';
import type { InviteRole, InviteRow } from '../model/rows';
import styles from './invite.module.css';

/**
 * One person to invite, as a row of 호호 HR's 사원 등록: its number, the email, the role and 삭제. Pasting several
 * addresses into the email fills the rows from here down (onPaste answers whether it took the paste).
 */
export function InviteRowFields({ row, index, roles, error, isDisabled, canRemove, onChange, onPaste, onRemove }: {
  row: InviteRow; index: number; roles: InviteRole[]; error?: string; isDisabled: boolean; canRemove: boolean;
  onChange: (patch: Partial<InviteRow>) => void; onPaste: (text: string) => boolean; onRemove: () => void;
}) {
  const label = (field: string) => `${index + 1}행 ${field}`;
  return <li className={styles.row} onPasteCapture={event => {
    if ((event.target as HTMLInputElement).type === 'email' && onPaste(event.clipboardData.getData('text/plain'))) event.preventDefault();
  }}>
    <span className={styles.index}>{index + 1}</span>
    <TextInput label={label('이메일')} isLabelHidden type="email" placeholder="name@company.com" value={row.email} isDisabled={isDisabled}
      onChange={email => onChange({ email: email.slice(0, 254) })} status={error ? { type: 'error', message: error } : undefined} />
    <Select label={label('역할')} isLabelHidden options={roles.map(each => ({ value: each, label: ROLE_LABELS[each] }))} value={row.role} isDisabled={isDisabled}
      onChange={role => onChange({ role: (role ?? 'member') as InviteRole })} />
    <IconButton label={`${index + 1}행 삭제`} icon={<NavIcon name="delete" />} variant="ghost" size="sm" onClick={onRemove} isDisabled={isDisabled || !canRemove} />
  </li>;
}
