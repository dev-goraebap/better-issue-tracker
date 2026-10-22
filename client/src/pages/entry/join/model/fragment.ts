let initialToken = '';
let listening = false;
const listeners = new Set<(token: string) => void>();
function capture() {
  if (window.location.pathname !== '/join' || !window.location.hash) return;
  const token = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
  // Strip before Router reads initial navigation or same-document history events.
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search);
  if (listeners.size) listeners.forEach(listener => listener(token));
  else initialToken = token;
}
export function captureJoinEntry() {
  capture();
  if (listening) return;
  listening = true;
  window.addEventListener('popstate', capture, { capture: true });
  window.addEventListener('hashchange', capture, { capture: true });
}
export function subscribeJoinToken(listener: (token: string) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
export function initialJoinToken() { return initialToken; }
export function forgetInitialToken() { initialToken = ''; }
