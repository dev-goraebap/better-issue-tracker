#!/usr/bin/env node
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { sources, hash, readState, writeState, locked, transport, plan, baseline, publish } from './manual-publication.mjs';

const [command = 'plan', manifest = 'docs/manuals/publication.json', stateFile = '.local/manual-publication.json', approved] = process.argv.slice(2);
try {
  if (!['plan', 'baseline', 'publish'].includes(command)) throw new Error('Use plan|baseline|publish [manifest] [state] [approved plan digest]');
  const endpoint = process.env.BIT_MCP_URL; const token = process.env.BIT_API_KEY;
  if (!endpoint || !token) throw new Error('BIT_MCP_URL and BIT_API_KEY are required');
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const source = await sources(path.resolve(manifest), new URL(endpoint).origin, revision);
  const dirty = execFileSync('git', ['status', '--porcelain', '--', path.dirname(path.resolve(manifest))], { encoding: 'utf8' }).trim();
  const context = { ...source, revision: dirty ? `${revision}+working-tree` : revision, workspace: source.manifest.workspace,
    binding: hash({ endpoint, repository: source.manifest.repository, workspace: source.manifest.workspace, project: source.manifest.project }) };
  const call = transport(endpoint, token);
  await locked(path.resolve(stateFile), async () => {
    const state = await readState(stateFile);
    const action = command === 'baseline' ? baseline : publish;
    const result = command === 'plan' ? await plan(context, state, call)
      : await action(context, state, call, approved, value => writeState(stateFile, value));
    console.log(JSON.stringify(result, null, 2));
  });
} catch (error) { console.error(error.message); process.exitCode = 1; }
