/** The roles an inviter may give: the owner adds admins, an admin members and viewers. */
export type InviteRole = 'admin' | 'member' | 'viewer';

/** One person to invite: an email and a role, keyed so React keeps the row while others come and go. */
export type InviteRow = { key: string; email: string; role: InviteRole };

/** What one invitation came to: its link (shown once) or why the server refused it. */
export type InviteResult = { key: string; email: string; role: InviteRole; link?: string; error?: string };

/** The most rows one page sends, as 호호 HR's 사원 등록 caps its rows. */
export const MAX_ROWS = 50;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let next = 0;

export const emptyRow = (role: InviteRole = 'member'): InviteRow => ({ key: `row-${++next}`, email: '', role });

/** The addresses in pasted text: one per line, or split by commas, semicolons, tabs or spaces (a column copied from a sheet). */
export const emailsIn = (text: string) => text.split(/[\s,;]+/).map(each => each.trim()).filter(Boolean);

/**
 * Text pasted into a row's email: several addresses fill that row and the rows after it (new rows taking the row's
 * role), up to MAX_ROWS; one address is left to the field. Answers the rows, or null when the paste is one address.
 */
export function pasteInto(rows: readonly InviteRow[], key: string, text: string): InviteRow[] | null {
  const emails = emailsIn(text);
  if (emails.length < 2) return null;
  const at = rows.findIndex(row => row.key === key);
  if (at < 0) return null;
  const role = rows[at]!.role;
  const filled = emails.map((email, index) => (index === 0 ? { ...rows[at]!, email } : { ...emptyRow(role), email }));
  return [...rows.slice(0, at), ...filled, ...rows.slice(at + 1)].slice(0, MAX_ROWS);
}

/**
 * What is wrong with each row, by key: an address that is not one, or one already above it. Empty rows are left out
 * of the invitation and say nothing, unless every row is empty.
 */
export function validateRows(rows: readonly InviteRow[]): Map<string, string> {
  const errors = new Map<string, string>();
  const seen = new Set<string>();
  const filled = rows.filter(row => row.email.trim());
  if (filled.length === 0 && rows[0]) errors.set(rows[0].key, '초대할 이메일을 입력해 주세요.');
  for (const row of filled) {
    const email = row.email.trim().toLowerCase();
    if (!EMAIL.test(email)) errors.set(row.key, '이메일 형식이 아닙니다.');
    else if (seen.has(email)) errors.set(row.key, '위에 같은 이메일이 있습니다.');
    seen.add(email);
  }
  return errors;
}

/** Every link made, one line each as 'email<TAB>link', to paste into a sheet or a message. */
export const linksText = (results: readonly InviteResult[]) => results.filter(result => result.link).map(result => `${result.email}\t${result.link}`).join('\n');
