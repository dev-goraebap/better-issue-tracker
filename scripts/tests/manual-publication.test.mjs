import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { hash, pageHash, plan, baseline, publish, sources, locked, readState, writeState } from '../manual-publication.mjs';

function fixture() {
  const pages = ['a','b'].map(key => ({ key, bookId: 'book', pageId: key, desired: { title: key, body: `new ${key}`, sectionId: '' } }));
  pages.forEach(p => p.sourceHash = pageHash(p.desired));
  const context = { pages, binding: 'target', workspace: 'test', revision: 'revision' };
  const remote = Object.fromEntries(pages.map(p => [p.key, { id: p.key, title: p.key, body: `old ${p.key}`, sectionId: '' }]));
  const comments = [{ id: 'comment', body: 'keep', resolved: false }];
  let version = 3; let updates = 0; const calls = [];
  const call = async (name, args) => {
    calls.push({ name, args });
    if (name === 'get_manual_page') return { version, page: structuredClone(remote[args.page_id]) };
    assert.equal(name, 'update_manual_page');
    assert.equal(args.expected_version, version); updates++; version++;
    Object.assign(remote[args.page_id], { title: args.title, body: args.body, sectionId: args.section_id === 'root' ? '' : args.section_id });
  };
  const state = { formatVersion: 1, pages: {} }; const saved = [];
  const save = async s => saved.push(structuredClone(s));
  const init = async () => baseline(context, state, call, (await plan(context,state,call)).digest, save);
  return { context, remote, comments, calls, call, state, saved, save, init, updates: () => updates };
}
test('baseline needs exact review digest and makes no remote writes', async () => {
  const f=fixture(); await assert.rejects(baseline(f.context,f.state,f.call,'wrong',f.save));
  await f.init(); assert.equal(f.updates(),0); assert.equal(f.saved.length,1);
});
test('publishes only changed page, preserves IDs/comments, then no reads/writes for unchanged sources', async () => {
  const f=fixture(); await f.init(); const before=structuredClone(f.comments);
  f.state.pages.b.sourceHash=f.context.pages[1].sourceHash;
  const review=await plan(f.context,f.state,f.call);
  await publish(f.context,f.state,f.call,review.digest,f.save);
  assert.equal(f.updates(),1); assert.equal(f.remote.a.id,'a');assert.equal(f.remote.b.body,'old b');assert.deepEqual(f.comments,before);
  const n=f.calls.length; await plan(f.context,f.state,f.call);assert.equal(f.calls.length,n);
});
test('remote title/body/section change conflicts even when book version alone cannot detect authorship', async () => {
  for(const field of ['title','body','sectionId']) {const f=fixture();await f.init();f.remote.a[field]='remote edit';
    const review=await plan(f.context,f.state,f.call);assert.equal(review.pages[0].status,'conflict');
    await assert.rejects(publish(f.context,f.state,f.call,review.digest,f.save));assert.equal(f.updates(),0);
  }
});
test('a remote edit after approval invalidates plan without writing', async () => {
  const f=fixture();await f.init();const review=await plan(f.context,f.state,f.call);f.remote.a.body='edited';
  await assert.rejects(publish(f.context,f.state,f.call,review.digest,f.save));assert.equal(f.updates(),0);
});
test('partial success checkpoints; uncertain successful second write is recovered without replay', async () => {
  const f=fixture();await f.init();let failed=false;
  const flaky=async(n,a)=>{const result=await f.call(n,a);if(n==='update_manual_page'&&a.page_id==='b'&&!failed){failed=true;throw Error('connection lost');}return result;};
  await assert.rejects(publish(f.context,f.state,flaky,(await plan(f.context,f.state,f.call)).digest,f.save));
  assert.ok(f.state.pages.a.sourceHash);assert.equal(f.state.pages.b.sourceHash,null);assert.equal(f.updates(),2);
  const next=await plan(f.context,f.state,f.call);assert.deepEqual(next.pages.map(p=>p.status),['unchanged','already-published']);
  await publish(f.context,f.state,f.call,next.digest,f.save);assert.equal(f.updates(),2);
});
test('version conflict stops without retry; changed target binding and ID are rejected',async()=>{
 const f=fixture();await f.init();const conflict=async(n,a)=>{if(n==='update_manual_page')throw Error('409');return f.call(n,a);};
 await assert.rejects(publish(f.context,f.state,conflict,(await plan(f.context,f.state,f.call)).digest,f.save));assert.equal(f.updates(),0);
 await assert.rejects(plan({...f.context,binding:'other'},f.state,f.call));
 f.context.pages[0].pageId='other';await assert.rejects(plan(f.context,f.state,f.call));
});
test('source parser converts local manual links, preserves code literals, rejects unsupported assets and rich blocks',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'manual-publish-'));
 try {const manifest=path.join(dir,'manifest.json');await writeFile(manifest,JSON.stringify({formatVersion:1,repository:'owner/repo',workspace:'space',books:[{key:'x',targetId:'book',pages:[{key:'a',targetId:'a',source:'a.md'},{key:'b',targetId:'b',source:'b.md'}]}]}));
 await writeFile(path.join(dir,'b.md'),'# B\n\nbody\n');
 await writeFile(path.join(dir,'a.md'),'# A\n\n[other](b.md)\n\n```md\n[code](b.md)\n<video src="example">\n```\n`<table>_id`\n');
 const result=await sources(manifest,'https://bit.test','revision');assert.match(result.pages[0].desired.body,/manual=book&page=b/);assert.match(result.pages[0].desired.body,/\[code\]\(b.md\)/);assert.match(result.pages[0].desired.body,/<video src="example">/);
 for(const body of ['![image](local.png)',':::columns\ntext','<video src="x">']){await writeFile(path.join(dir,'a.md'),`# A\n\n${body}\n`);await assert.rejects(sources(manifest,'https://bit.test','revision'));}
 } finally {await rm(dir,{recursive:true,force:true});}
});
test('atomic checkpoints and concurrent local run exclusion',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'manual-state-'));const file=path.join(dir,'state.json');
 try {await locked(file,async()=>{await writeState(file,{formatVersion:1,pages:{a:1}});await assert.rejects(locked(file,async()=>{}));});assert.deepEqual(await readState(file),{formatVersion:1,pages:{a:1}});}finally{await rm(dir,{recursive:true,force:true});}
});
