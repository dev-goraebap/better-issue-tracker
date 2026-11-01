import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, writeFile, rename, realpath, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

export const hash = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fields = p => ({ title: p.title, body: p.body, sectionId: p.sectionId ?? '' });
export const pageHash = p => hash(fields(p));
export async function readState(file) {
  try {
    const state = JSON.parse(await readFile(file, 'utf8'));
    if (state.formatVersion !== 1 || !state.pages || typeof state.pages !== 'object') throw new Error('Invalid publication state');
    return state;
  }
  catch (error) { if (error.code === 'ENOENT') return { formatVersion: 1, pages: {} }; throw error; }
}
export async function writeState(file, state) {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.tmp`;
  await writeFile(temp, JSON.stringify(state, null, 2) + '\n', { mode: 0o600 });
  await rename(temp, file);
}
export async function locked(file, work) {
  await mkdir(path.dirname(file), { recursive: true });
  await mkdir(`${file}.lock`); // fail closed for concurrent or interrupted local runs
  try { return await work(); } finally { await rm(`${file}.lock`, { recursive: true }); }
}
// Fences and inline code are examples, not links or rich nodes to publish.
function markdownParts(body) {
  const result = []; let marker; let prose = ''; let code = '';
  const flush = () => { if (prose) result.push(...prose.split(/(`+[^`\n]*`+)/g).filter(Boolean).map(text => ({ text, literal: text.startsWith('`') }))); prose = ''; };
  for (const line of body.split(/(?<=\n)/)) {
    const fence = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (!marker && fence) { flush(); marker=fence[1]; code=line; }
    else if (marker) { code+=line; if (fence && fence[1][0]===marker[0] && fence[1].length>=marker.length) {result.push({text:code,literal:true});marker=undefined;code='';} }
    else prose+=line;
  }
  flush(); if(code) result.push({text:code,literal:true}); return result;
}
export async function sources(manifestFile, site, revision) {
  const root = path.dirname(await realpath(manifestFile));
  const m = JSON.parse(await readFile(manifestFile, 'utf8'));
  if (m.formatVersion !== 1 || !m.repository || !m.workspace) throw new Error('Invalid publication manifest');
  const seen = new Set(); const routes = new Map();
  const list = [];
  for (const b of m.books) for (const p of b.pages) {
    const file = await realpath(path.resolve(root, p.source));
    if (path.relative(root, file).startsWith('..')) throw new Error('Source escapes manifest directory');
    const key = `${b.key}/${p.key}`;
    const target = `${b.targetId}/${p.targetId}`;
    if (seen.has(key) || seen.has(`target:${target}`)) throw new Error('Duplicate source key or target ID');
    seen.add(key); seen.add(`target:${target}`);
    if (p.sidecar || p.blocks) throw new Error('Structured block sidecars need a supported adapter');
    if (!b.targetId || !p.targetId) throw new Error('Only existing page targets are supported');
    const url = `${site}/workspaces/${encodeURIComponent(m.workspaceId ?? m.workspace)}/manuals?manual=${encodeURIComponent(b.targetId)}&page=${encodeURIComponent(p.targetId)}`;
    routes.set(file, url); list.push({ key, bookId: b.targetId, pageId: p.targetId, file, sectionId: p.sectionId ?? '' });
  }
  for (const p of list) {
    const text = (await readFile(p.file, 'utf8')).replace(/\r\n/g, '\n');
    const match = text.match(/^# ([^\n]+)\n\n([\s\S]*)$/);
    if (!match) throw new Error(`Expected H1 title and blank line: ${p.key}`);
    let body = match[2].replace(/\n$/, '');
    for (const part of markdownParts(body)) {
      if (!part.literal && (/^:::/m.test(part.text) || /<\/?[a-z][a-z0-9-]*(?:\s[^>]*|\/?)>/.test(part.text))) throw new Error(`Unsupported rich block: ${p.key}`);
    }
    // Keep fenced examples literal. Transform only actual inline Markdown links/images.
    body = markdownParts(body).map(({text: part, literal}) => literal ? part : part.replace(/(!?\[[^\]\n]*\])\(([^)\n]+)\)/g, (_, label, target) => {
      if (/^(https?:|mailto:|attachment:|#)/.test(target)) return `${label}(${target})`;
      if (/^[a-z]+:/i.test(target) || target.startsWith('//')) throw new Error(`Unsupported link: ${p.key}`);
      const [relative, fragment] = target.split('#');
      const file = path.resolve(path.dirname(p.file), relative);
      if (label.startsWith('!')) throw new Error(`Local assets need upload mapping: ${p.key}`);
      let url = routes.get(file);
      if (!url) {
        const repoRoot = path.resolve(root, '../..');
        const repoPath = path.relative(repoRoot, file).replaceAll('\\', '/');
        if (repoPath.startsWith('..')) throw new Error('Link escapes repository');
        let linkRevision = revision;
        try { linkRevision = execFileSync('git', ['log', '-1', '--format=%H', '--', file], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || revision; } catch { /* fixture or unavailable history */ }
        url = `https://github.com/${m.repository}/blob/${encodeURIComponent(linkRevision)}/${repoPath.split('/').map(encodeURIComponent).join('/')}`;
      }
      return `${label}(${url}${fragment ? `#${fragment}` : ''})`;
    })).join('');
    p.desired = { title: match[1], body, sectionId: p.sectionId };
    p.sourceHash = hash(p.desired);
  }
  return { manifest: m, pages: list };
}
export function transport(endpoint, token) {
  const url = new URL(endpoint);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))) throw new Error('HTTPS required');
  return async (name, args) => {
    const response = await fetch(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name, arguments: args } }) });
    if (!response.ok) throw new Error(`MCP HTTP ${response.status}`);
    const rpc = await response.json();
    if (rpc.error || rpc.result?.isError) throw new Error('MCP rejected request (check permissions/version)');
    const text = rpc.result?.content?.find(c => c.type === 'text')?.text;
    if (!text) throw new Error('Invalid MCP response');
    return JSON.parse(text);
  };
}
export async function plan(context, state, call) {
  const { pages, binding, workspace } = context;
  if (state.binding && state.binding !== binding) throw new Error('Publication state belongs to a different target');
  const result = [];
  for (const p of pages) {
    const base = state.pages[p.key];
    if (base && (base.bookId !== p.bookId || base.pageId !== p.pageId)) throw new Error(`Target changed: ${p.key}`);
    if (base?.sourceHash === p.sourceHash) { result.push({ key: p.key, status: 'unchanged' }); continue; }
    const remote = await call('get_manual_page', { workspace, id: p.bookId, page_id: p.pageId });
    if (remote.page.id !== p.pageId) throw new Error('Page ID mismatch');
    const remoteHash = pageHash(remote.page);
    const status = !base ? 'baseline-required' : remoteHash === p.sourceHash ? 'already-published'
      : remoteHash !== base.remoteHash ? 'conflict' : 'changed';
    result.push({ key: p.key, status, remoteHash, version: remote.version, desiredHash: p.sourceHash, before: fields(remote.page), after: p.desired });
  }
  return { binding, pages: result, digest: hash({ binding, pages: result }) };
}
export async function baseline(context, state, call, approved, save) {
  const review = await plan(context, state, call);
  if (review.digest !== approved || review.pages.some(p => p.status === 'conflict')) throw new Error('Plan approval mismatch or conflict');
  state.binding = context.binding;
  for (const row of review.pages.filter(p => p.status === 'baseline-required')) {
    const p = context.pages.find(p => p.key === row.key);
    state.pages[p.key] = { bookId: p.bookId, pageId: p.pageId, remoteHash: row.remoteHash, targetVersion: row.version, sourceHash: null };
  }
  await save(state); return review;
}
export async function publish(context, state, call, approved, save) {
  const review = await plan(context, state, call);
  if (review.digest !== approved) throw new Error('Plan approval mismatch; review latest plan');
  if (review.pages.some(p => ['baseline-required', 'conflict'].includes(p.status))) throw new Error('Baseline required or remote edit conflict');
  for (const row of review.pages.filter(p => p.status !== 'unchanged')) {
    const p = context.pages.find(p => p.key === row.key);
    const latest = await call('get_manual_page', { workspace: context.workspace, id: p.bookId, page_id: p.pageId });
    const current = pageHash(latest.page);
    if (current !== row.remoteHash) throw new Error(`Remote edit conflict: ${p.key}`);
    if (current !== p.sourceHash) {
      // A confirmed page command preserves the server's comments and all unrelated pages.
      await call('update_manual_page', { workspace: context.workspace, id: p.bookId, page_id: p.pageId,
        expected_version: latest.version, title: p.desired.title, body: p.desired.body, section_id: p.desired.sectionId || 'root' });
    }
    const check = await call('get_manual_page', { workspace: context.workspace, id: p.bookId, page_id: p.pageId });
    if (check.page.id !== p.pageId || pageHash(check.page) !== p.sourceHash) throw new Error(`Post-write verification failed: ${p.key}`);
    state.binding = context.binding;
    state.pages[p.key] = { bookId: p.bookId, pageId: p.pageId, remoteHash: p.sourceHash, sourceHash: p.sourceHash,
      targetVersion: check.version, sourceRevision: context.revision, adapterVersion: 1 };
    await save(state); // checkpoint each page; an uncertain write is recovered by the next plan, never replayed blindly
  }
  return review;
}
