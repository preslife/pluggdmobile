import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url), ts=require('typescript');
const source=readFileSync(new URL('../src/features/studio/nativeMixRevision.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(compiled.diagnostics.filter(item=>item.category===ts.DiagnosticCategory.Error).length,0);
const loaded={}; let timerId=0; const timers=new Map();
new Function('require','exports','setTimeout','clearTimeout',compiled.outputText)(id=>{
  if(id==='@react-native-async-storage/async-storage') return {default:{}};
  if(id==='expo-crypto'||id==='../../lib/supabase'||id==='../playback/mixAccessSession') return {};
  throw new Error(`Unexpected import ${id}`);
},loaded,(callback,delay)=>{const id=++timerId;timers.set(id,{callback,delay});return id;},id=>timers.delete(id));
const {NativeMixRevisionClient,NativeMixRevisionError}=loaded;
const actor='20000000-0000-4000-8000-000000000001', other='20000000-0000-4000-8000-000000000002';
const mix='10000000-0000-4000-8000-000000000001';
const scope={actor,generation:1,instance:'fixture'};
const revision='2026-11-02T12:00:00.123456+00:00';
const result={id:mix,updated_at:revision,status:'published',visibility:'private',current:true};
const reason=value=>error=>error instanceof NativeMixRevisionError&&error.reason===value;
function fixture() {
  let serial=0;
  const f={store:new Map(),calls:[],current:true,mode:'success',onInvoke:null,failCleanup:false,failStore:false};
  f.deps={session:{current:()=>f.current},randomUUID:()=>`30000000-0000-4000-8000-${String(++serial).padStart(12,'0')}`,
    storage:{getItem:async key=>f.store.get(key)??null,setItem:async(key,value)=>{if(f.failStore)throw new Error('disk full /private');f.store.set(key,value);},
      removeItem:async key=>{if(f.failCleanup)throw new Error('cleanup interrupted');f.store.delete(key);}},
    invoke:async payload=>{
      f.calls.push(structuredClone(payload));if(f.onInvoke)return f.onInvoke(payload);
      if(f.mode==='failed')throw new Error('provider token=synthetic private source');
      if(f.mode==='conflict')return{data:null,error:{code:'40001',message:'private diagnostic'}};
      return{data:result,error:null};
    }};
  f.client=new NativeMixRevisionClient(f.deps);
  f.input=extra=>({actorId:actor,scope,mixId:mix,expectedUpdatedAt:revision,details:{title:'Owner edit'},...extra});
  return f;
}
let count=0;
async function test(name,run){await run();assert.equal(timers.size,0,`${name}: deadline leaked`);count++;console.log(`PASS ${name}`);}
await test('exact actor-bound request is durable before RPC, and a verified acknowledgement clears it',async()=>{
  const f=fixture();f.onInvoke=async payload=>{assert.equal(f.store.size,1);assert.equal(payload.p_expected_updated_at,revision);return{data:result,error:null};};
  assert.deepEqual(await f.client.save(f.input()),{id:mix,updatedAt:revision,status:'published',visibility:'private',current:true,recoveryPending:false});
  assert.equal(f.store.size,0);assert.equal(f.calls.length,1);
});
await test('lost response preserves original request ID across app restart and exact retry',async()=>{
  const f=fixture();f.mode='failed';await assert.rejects(f.client.save(f.input()),reason('unavailable'));
  assert.equal(f.store.size,1);const request=f.calls[0];f.mode='success';
  await new NativeMixRevisionClient(f.deps).resume(f.input());assert.deepEqual(f.calls[1],request);assert.equal(f.store.size,0);
});
await test('an edited form cannot replace an unconfirmed request; explicit recovery replays the old intent',async()=>{
  const f=fixture();f.mode='failed';await assert.rejects(f.client.save(f.input()));f.mode='success';
  await assert.rejects(f.client.save(f.input({details:{title:'Newer unsaved form'}})),reason('pending'));assert.equal(f.calls.length,1);
  await f.client.resume(f.input());assert.equal(f.calls[1].p_details.title,'Owner edit');
});
await test('semantic object key order does not produce a different retry',async()=>{
  const f=fixture();f.mode='failed';await assert.rejects(f.client.save(f.input({details:{title:'Same',description:'Body'}})));f.mode='success';
  await f.client.save(f.input({details:{description:'Body',title:'Same'}}));assert.equal(f.calls[0].p_request_id,f.calls[1].p_request_id);
});
await test('caller mutation after pressing Save cannot alter the request during a delayed local read',async()=>{
  const f=fixture();let releaseRead;f.deps.storage.getItem=()=>new Promise(resolve=>{releaseRead=()=>resolve(null);});
  const input=f.input();const work=f.client.save(input);input.details.title='Changed while saving';releaseRead();await work;
  assert.equal(f.calls[0].p_details.title,'Owner edit');
});
await test('another account cannot recover the original account pending mutation',async()=>{
  const f=fixture();f.mode='failed';await assert.rejects(f.client.save(f.input()));
  await assert.rejects(f.client.resume(f.input({actorId:other})),reason('changed'));
  await assert.rejects(f.client.resume(f.input({actorId:other,scope:{...scope,actor:other}})),reason('noPending'));
  assert.equal(f.calls.length,1);assert.equal(f.store.size,1);
});
await test('actor or route change after the server commits never acknowledges or clears a stale screen',async()=>{
  const f=fixture();f.onInvoke=async()=>{f.current=false;return{data:result,error:null};};
  await assert.rejects(f.client.save(f.input()),reason('changed'));assert.equal(f.store.size,1);
  const g=fixture();let current=true;g.onInvoke=async()=>{current=false;return{data:result,error:null};};
  await assert.rejects(g.client.save(g.input({assertCurrent(){if(!current)throw new Error('route changed');}})),reason('changed'));assert.equal(g.store.size,1);
});
await test('definitive rolled-back conflicts release only the request receipt and leave the edited form for review',async()=>{
  const f=fixture();f.mode='conflict';const input=f.input();await assert.rejects(f.client.save(input),reason('conflict'));
  assert.equal(f.store.size,0);assert.equal(input.details.title,'Owner edit');
});
await test('definitive validation/authority failures allow corrections without trapping an invalid pending request',async()=>{
  for(const [code,expected] of [['22023','invalid'],['22P02','invalid'],['23514','invalid'],['42501','permission']]) {
    const f=fixture();f.onInvoke=async()=>({data:null,error:{code,message:'provider private detail'}});
    const input=f.input();await assert.rejects(f.client.save(input),reason(expected));assert.equal(f.store.size,0);
    assert.equal(input.details.title,'Owner edit');
  }
});
await test('database deadlock is retried once using the same exact request, with no fresh IDs',async()=>{
  const f=fixture();f.onInvoke=async()=>f.calls.length===1?{data:null,error:{code:'40P01'}}:{data:result,error:null};
  await f.client.save(f.input());assert.equal(f.calls.length,2);assert.deepEqual(f.calls[0],f.calls[1]);assert.equal(f.store.size,0);
  const g=fixture();g.onInvoke=async()=>({data:null,error:{code:'40P01'}});
  await assert.rejects(g.client.save(g.input()),reason('unavailable'));assert.equal(g.calls.length,2);assert.equal(g.store.size,1);
});
await test('malformed or wrong-target acknowledgements retain the recovery copy',async()=>{
  for(const value of [null,{...result,id:other},{...result,current:undefined},{...result,visibility:'invalid'},{...result,updated_at:'wrong'}]){
    const f=fixture();f.onInvoke=async()=>({data:value,error:null});await assert.rejects(f.client.save(f.input()),reason('unavailable'));assert.equal(f.store.size,1);
  }
});
await test('a committed earlier revision is reported current=false, not silently represented as the latest version',async()=>{
  const f=fixture();f.onInvoke=async()=>({data:{...result,current:false},error:null});const saved=await f.client.save(f.input());
  assert.equal(saved.current,false);assert.equal(f.store.size,0);
});
await test('failed local receipt storage blocks the server call; failed cleanup reports a confirmed save with recovery still present',async()=>{
  const f=fixture();f.failStore=true;await assert.rejects(f.client.save(f.input()),reason('unavailable'));assert.equal(f.calls.length,0);
  const g=fixture();g.failCleanup=true;const saved=await g.client.save(g.input());assert.equal(saved.recoveryPending,true);assert.equal(g.store.size,1);
});
await test('signed sources, invalid owner fields and missing revision are rejected before durable mutation staging',async()=>{
  for(const extra of [{details:{audio_url:'https://local.invalid/storage/v1/object/sign/mix-media/path?token=secret'}},
    {details:{cover_url:'https://local.invalid/cover?access_token=secret'}},{details:{owner_user_id:other}},{expectedUpdatedAt:null}]){
    const f=fixture();await assert.rejects(f.client.save(f.input(extra)),reason('unavailable'));assert.equal(f.calls.length,0);assert.equal(f.store.size,0);
  }
});
await test('a bounded unknown result keeps its receipt and does not start a late deadlock retry',async()=>{
  const f=fixture();let finish;f.onInvoke=()=>new Promise(resolve=>{finish=resolve;});
  const work=f.client.save(f.input());for(let step=0;step<20&&!finish;step++)await Promise.resolve();assert.ok(finish);
  [...timers.values()].find(timer=>timer.delay===15_000).callback();await assert.rejects(work,reason('unavailable'));assert.equal(f.store.size,1);
  finish({data:null,error:{code:'40P01'}});for(let step=0;step<20;step++)await Promise.resolve();assert.equal(f.calls.length,1);
});
await test('concurrent submissions cannot stage a second mutation for the same actor and Mix',async()=>{
  const f=fixture();let finish;f.onInvoke=()=>new Promise(resolve=>{finish=resolve;});
  const work=f.client.save(f.input());await assert.rejects(f.client.save(f.input()),reason('pending'));
  for(let step=0;step<20&&!finish;step++)await Promise.resolve();finish({data:result,error:null});await work;assert.equal(f.calls.length,1);
});
await test('confirmed network acknowledgement retires its deadline before slow local cleanup',async()=>{
  const f=fixture();let finishCleanup;
  f.deps.storage.removeItem=key=>new Promise(resolve=>{finishCleanup=()=>{f.store.delete(key);resolve();};});
  const work=f.client.save(f.input());for(let step=0;step<30&&!finishCleanup;step++)await Promise.resolve();
  assert.ok(finishCleanup);assert.equal(timers.size,0,'RPC deadline cannot expire during known-save cleanup');
  finishCleanup();const saved=await work;assert.equal(saved.current,true);assert.equal(saved.recoveryPending,false);
});
console.log(`PASS ${count} actual-source native Mix revision cases. SDK/local-store boundaries mocked; database authority is checked separately; no hosted writes.`);
