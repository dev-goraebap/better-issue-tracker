/**
 * Whether a key press belongs to something other than the page's own shortcuts: typed with a modifier or while
 * composing (Korean input), pressed in a field or an open menu, list or combobox, or under an open dialog. A page's
 * single-key shortcuts (C, T, ←/→, Esc to leave settings) check this first.
 */
export function isForOther(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.isComposing) return true;
  const target = event.target as HTMLElement | null;
  if (target?.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="menu"]')) return true;
  return !!document.querySelector('dialog[open]');
}
