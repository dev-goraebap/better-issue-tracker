import { useState } from 'react';
const KEY = 'bit-sidebar-folded';
function stored() {
  try { const own = localStorage.getItem(KEY); if (own !== null) return own === 'true'; return JSON.parse(localStorage.getItem('astryx-resizable:bit-sidebar') ?? '{}').isCollapsed === true; } catch { return false; }
}
export function useSidebarFold(): [boolean, (next: boolean) => void] {
  const [folded, setFolded] = useState(stored);
  return [folded, next => { setFolded(next); try { localStorage.setItem(KEY, String(next)); } catch { /* The choice still lasts this visit. */ } }];
}
