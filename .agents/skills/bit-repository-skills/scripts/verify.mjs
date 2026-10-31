#!/usr/bin/env node
// Drives a throwaway BIT for verification (bit-repository-skills, playbooks/verify.md): its own data folder and ports, started from this checkout
// the way dev.sh does (the server's bootRun in the dev profile, the client's Vite), with a first account, a workspace and
// an API key made through the real API. Each run lives in .tmp/verify/<run>/; cleanup stops what launch started and
// keeps evidence/ and logs/.
//
//   node .agents/skills/bit-repository-skills/scripts/verify.mjs launch <run>
//   node .agents/skills/bit-repository-skills/scripts/verify.mjs doctor <run>
//   node .agents/skills/bit-repository-skills/scripts/verify.mjs api <run> <METHOD> <path> [json|@file] [--save <label>]
//   node .agents/skills/bit-repository-skills/scripts/verify.mjs mcp <run> <tool|--list> [json] [--save <label>]
//   node .agents/skills/bit-repository-skills/scripts/verify.mjs db <run> "<select …>" [--save <label>]
//   node .agents/skills/bit-repository-skills/scripts/verify.mjs note <run> <label>   (stdin → evidence)
//   node .agents/skills/bit-repository-skills/scripts/verify.mjs cleanup <run>
//   node .agents/skills/bit-repository-skills/scripts/verify.mjs list
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, openSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../../../..');
const RUNS = join(ROOT, '.tmp', 'verify');
const WINDOWS = process.platform === 'win32';
const READY_SECONDS = 420;

const [command, run, ...rest] = process.argv.slice(2);
const fail = message => { console.error(`verify: ${message}`); process.exit(1); };
const paths = name => {
  if (!/^[a-z0-9][a-z0-9-]{0,39}$/.test(name ?? '')) fail('a run is named with lowercase letters, digits and hyphens, such as status-board');
  const base = join(RUNS, name);
  return { base, data: join(base, 'data'), logs: join(base, 'logs'), evidence: join(base, 'evidence'),
    state: join(base, 'state.json'), account: join(base, 'account.json') };
};
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
const writePrivate = (file, value) => { writeFileSync(file, JSON.stringify(value, null, 2)); if (!WINDOWS) chmodSync(file, 0o600); };
const sleep = ms => new Promise(done => setTimeout(done, ms));
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
const git = (...args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' }).stdout.trim();
const option = (name) => { const at = rest.indexOf(name); if (at < 0) return undefined; const value = rest[at + 1]; rest.splice(at, 2); return value; };

function freePort() {
  return new Promise((done, failed) => {
    const server = createServer();
    server.once('error', failed);
    server.listen(0, '127.0.0.1', () => { const { port } = server.address(); server.close(() => done(port)); });
  });
}

/** Starts a command in its own process group with its output in a log, so cleanup can stop exactly it and its children. */
function start(name, cwd, line, env, logs) {
  const out = openSync(join(logs, `${name}.log`), 'a');
  // cmd takes the line as written (its own quoting), so a checkout path with spaces or brackets still runs.
  const child = spawn(WINDOWS ? 'cmd.exe' : 'sh', WINDOWS ? ['/d', '/s', '/c', `"${line}"`] : ['-c', line],
    { cwd, env: { ...process.env, ...env }, detached: true, windowsHide: true, windowsVerbatimArguments: true, stdio: ['ignore', out, out] });
  child.unref();
  return child.pid;
}

function stop(pid) {
  if (!pid || !alive(pid)) return;
  if (WINDOWS) spawnSync('taskkill', ['/PID', String(pid), '/T', '/F'], { stdio: 'ignore' });
  else { try { process.kill(-pid, 'SIGTERM'); } catch { /* already gone */ } }
}

async function until(what, check, seconds, pids) {
  const end = Date.now() + seconds * 1000;
  for (;;) {
    try { if (await check()) return; } catch { /* not up yet */ }
    if (pids.some(pid => !alive(pid))) throw new Error(`${what}: a process it needs stopped; read the logs in ${paths(run).logs}`);
    if (Date.now() > end) throw new Error(`${what} not ready after ${seconds}s; read the logs in ${paths(run).logs}`);
    await sleep(2000);
  }
}

/** The browser's way in: a cookie jar, the CSRF header and the client's Origin on every write (README, D-030). */
function session(origin) {
  const jar = new Map();
  let csrf;
  const remember = response => {
    for (const cookie of response.headers.getSetCookie?.() ?? []) { const [pair] = cookie.split(';'); const at = pair.indexOf('='); jar.set(pair.slice(0, at), pair.slice(at + 1)); }
  };
  const cookies = () => [...jar].map(([key, value]) => `${key}=${value}`).join('; ');
  const call = async (method, path, body) => {
    if (method !== 'GET' && !csrf) {
      const response = await fetch(origin + '/api/v1/auth/csrf', { headers: { Cookie: cookies() } });
      remember(response);
      csrf = await response.json();
    }
    const response = await fetch(origin + path, { method, redirect: 'manual', headers: {
      Accept: 'application/json', Origin: origin, Cookie: cookies(),
      ...(method === 'GET' ? {} : { [csrf.headerName]: csrf.token }), ...(body ? { 'Content-Type': 'application/json' } : {}),
    }, body: body ? JSON.stringify(body) : undefined });
    remember(response);
    const text = await response.text();
    if (!response.ok) throw new Error(`${method} ${path} answered ${response.status}: ${text.slice(0, 300)}`);
    if (path.startsWith('/api/v1/auth/')) csrf = undefined; // signing in or out turns the token over
    return text ? JSON.parse(text) : {};
  };
  return call;
}

function evidence(label, value) {
  const { evidence: folder } = paths(run);
  mkdirSync(folder, { recursive: true });
  const number = String(readdirSync(folder).length + 1).padStart(2, '0');
  const file = join(folder, `${number}-${label.replace(/[^a-z0-9-]+/gi, '-')}${typeof value === 'string' ? '.txt' : '.json'}`);
  writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  console.error(`saved ${file}`);
}

function state() {
  const { state: file } = paths(run);
  if (!existsSync(file)) fail(`no run ${run}; launch it first`);
  return readJson(file);
}

async function launch() {
  const p = paths(run);
  if (existsSync(p.state) && readJson(p.state).pids?.some(alive)) fail(`${run} is already running; doctor it or clean it up`);
  if (!existsSync(join(ROOT, 'client', 'node_modules', 'vite'))) fail('client has no node_modules; run npm ci in client first');
  rmSync(p.data, { recursive: true, force: true });
  for (const folder of [p.data, p.logs, p.evidence]) mkdirSync(folder, { recursive: true });
  const [serverPort, clientPort] = [await freePort(), await freePort()];
  // The screens on 127.0.0.1, not localhost: a browser keeps cookies by host, not port, so a sign-in here would replace
  // the one of any other BIT on localhost (and theirs this one).
  const client = `http://127.0.0.1:${clientPort}`;
  const server = `http://localhost:${serverPort}`;
  const gradle = WINDOWS ? `"${join(ROOT, 'server', 'gradlew.bat')}"` : 'sh ./gradlew';
  const serverPid = start('server', join(ROOT, 'server'), `${gradle} bootRun --no-daemon --console=plain --args=--spring.profiles.active=dev`, {
    SERVER_PORT: String(serverPort), DB_PATH: join(p.data, 'bit.db'), STORAGE_LOCAL_ROOT: join(p.data, 'files'),
    AUTH_COOKIE_SECURE: 'false', AUTH_ALLOWED_ORIGINS: `${client},${server}`,
  }, p.logs);
  const clientPid = start('client', join(ROOT, 'client'), `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${clientPort} --strictPort`,
    { DEV_API_TARGET: server }, p.logs);
  const pids = [serverPid, clientPid];
  writePrivate(p.state, { run, revision: git('rev-parse', 'HEAD'), dirty: git('status', '--porcelain') !== '', serverPort, clientPort, client, server, pids, startedAt: new Date().toISOString() });

  // Usable, not just answering: the server has migrated (health is up only after Flyway), the client serves the page, and
  // the client's proxy reaches this server. A launch that fails stops what it started.
  try {
    await until('server', async () => (await (await fetch(server + '/api/v1/health')).json()).status === 'UP', READY_SECONDS, pids);
    await until('client', async () => (await fetch(client + '/')).ok && (await fetch(client + '/api/v1/health')).ok, 120, pids);
  } catch (error) {
    pids.forEach(stop);
    fail(`${error.message}; stopped what this launch started`);
  }

  // The first account, its workspace and an API key, made the way a person and the screens make them. The password is a
  // test value for this run only, kept in account.json beside its data and removed by cleanup.
  const call = session(client);
  const account = { name: '검증 관리자', email: `verify-${run}@example.test`, password: randomBytes(18).toString('base64url') };
  try {
    await call('POST', '/api/v1/auth/bootstrap', account);
    await call('POST', '/api/v1/auth/sessions', { email: account.email, password: account.password });
    await call('POST', '/api/v1/workspaces', { name: '검증 워크스페이스', slug: `verify-${run}` });
    const { items: [workspace] } = await call('GET', '/api/v1/me/workspaces');
    const key = await call('POST', '/api/v1/me/api-keys', { name: 'verify-bit', currentPassword: account.password });
    writePrivate(p.account, { ...account, apiKey: key.key, workspace: { id: workspace.id, name: workspace.name, slug: workspace.slug } });
    console.log(JSON.stringify({ run, client, server, workspace: workspace.slug, account: p.account, evidence: p.evidence }, null, 2));
  } catch (error) {
    pids.forEach(stop);
    fail(`making the first account failed: ${error.message}; stopped what this launch started`);
  }
}

async function doctor() {
  const s = state();
  const account = existsSync(paths(run).account) ? readJson(paths(run).account) : undefined;
  const report = { run, client: s.client, processes: s.pids.map(alive), revision: s.revision, head: git('rev-parse', 'HEAD') };
  report.sameRevision = report.revision === report.head;
  report.health = await fetch(s.server + '/api/v1/health').then(r => r.json()).then(r => r.status).catch(() => 'down');
  report.screens = await fetch(s.client + '/').then(r => r.ok).catch(() => false);
  report.apiKey = account ? await fetch(s.client + '/api/v1/me/workspaces', { headers: { Authorization: `Bearer ${account.apiKey}` } })
    .then(r => r.status).catch(() => 'down') : 'no account';
  const ok = report.processes.every(Boolean) && report.health === 'UP' && report.screens && report.apiKey === 200;
  console.log(JSON.stringify({ ok, ...report }, null, 2));
  if (!report.sameRevision) console.error('HEAD moved since launch: the client reloads on its own, the server runs the code it started with.');
  if (!ok) process.exit(1);
}

async function bearer(path, init = {}) {
  const s = state();
  const { apiKey } = readJson(paths(run).account);
  const response = await fetch(s.client + path, { ...init, headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}`,
    ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers } });
  const text = await response.text();
  let body; try { body = JSON.parse(text); } catch { body = text; }
  return { status: response.status, location: response.headers.get('Location') ?? undefined, body };
}

const bodyOf = value => (value === undefined ? undefined : value.startsWith('@') ? readFileSync(value.slice(1), 'utf8') : value);

async function api() {
  const label = option('--save');
  const [method, given, body] = rest;
  // Git Bash rewrites a leading /api/... into a Windows path; what follows /api/ is still the address.
  const at = given?.indexOf('/api/') ?? -1;
  const path = at >= 0 ? given.slice(at) : given?.startsWith('api/') ? `/${given}` : undefined;
  if (!method || !path) fail('api <run> <METHOD> </api/...> [json|@file]');
  const result = await bearer(path, { method: method.toUpperCase(), body: bodyOf(body) });
  console.log(JSON.stringify(result, null, 2));
  if (label) evidence(label, { request: { method, path, body: body && JSON.parse(bodyOf(body)) }, ...result });
  if (result.status >= 400) process.exit(1);
}

async function mcp() {
  const label = option('--save');
  const [tool, args] = rest;
  if (!tool) fail('mcp <run> <tool|--list> [json]');
  const message = tool === '--list' ? { jsonrpc: '2.0', id: 1, method: 'tools/list' }
    : { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: tool, arguments: args ? JSON.parse(bodyOf(args)) : {} } };
  const result = await bearer('/api/mcp', { method: 'POST', body: JSON.stringify(message), headers: { Accept: 'application/json, text/event-stream' } });
  const output = tool === '--list' ? result.body?.result?.tools?.map(each => each.name) ?? result : result;
  console.log(JSON.stringify(output, null, 2));
  if (label) evidence(label, { tool, arguments: args && JSON.parse(bodyOf(args)), ...result });
  if (result.status >= 400 || result.body?.error || result.body?.result?.isError) process.exit(1);
}

async function db() {
  const label = option('--save');
  const [sql] = rest;
  if (!/^\s*(select|with|pragma)\b/i.test(sql ?? '')) fail('db reads only: give a SELECT, WITH or PRAGMA');
  const { DatabaseSync } = await import('node:sqlite');
  const connection = new DatabaseSync(join(paths(run).data, 'bit.db'), { readOnly: true });
  const rows = connection.prepare(sql).all();
  connection.close();
  console.log(JSON.stringify(rows, null, 2));
  if (label) evidence(label, { sql, rows });
}

async function note() {
  const [label] = rest;
  if (!label) fail('note <run> <label> < text');
  state();
  evidence(label, readFileSync(0, 'utf8'));
}

async function cleanup() {
  const p = paths(run);
  const s = state();
  s.pids.forEach(stop);
  await sleep(1500);
  const left = s.pids.filter(alive);
  if (left.length) fail(`still running: ${left.join(', ')}; stop them by these ids, never by process name`);
  rmSync(p.data, { recursive: true, force: true });
  rmSync(p.account, { force: true });
  writePrivate(p.state, { ...s, pids: [], stoppedAt: new Date().toISOString() });
  const kept = existsSync(p.evidence) ? readdirSync(p.evidence) : [];
  console.log(JSON.stringify({ run, stopped: s.pids, removed: ['data', 'account.json'], evidence: p.evidence, kept }, null, 2));
}

function list() {
  if (!existsSync(RUNS)) return console.log('[]');
  console.log(JSON.stringify(readdirSync(RUNS).filter(name => existsSync(join(RUNS, name, 'state.json'))).map(name => {
    const s = readJson(join(RUNS, name, 'state.json'));
    return { run: name, client: s.client, running: s.pids.some(alive), startedAt: s.startedAt, stoppedAt: s.stoppedAt };
  }), null, 2));
}

const commands = { launch, doctor, api, mcp, db, note, cleanup, list };
if (!commands[command]) fail(`commands: ${Object.keys(commands).join(', ')}`);
if (command !== 'list') paths(run);
await commands[command]();
