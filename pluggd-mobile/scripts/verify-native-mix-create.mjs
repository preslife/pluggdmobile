import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),ts=require('typescript');
const source=readFileSync(new URL('../src/features/studio/creatorUploadService.ts',import.meta.url),'utf8');
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
assert.equal(code.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
const actor='20000000-0000-4000-8000-000000000001',mix='10000000-0000-4000-8000-000000000001';
const scope={actor,generation:1,instance:'fixture'};
function fixture(){
 const f={calls:[],current:true,pending:false,existing:null,fail:null};const exports={};
 const revision={hasPending:async()=>f.pending,resume:async context=>{f.calls.push(['resume',context]);return{id:mix,current:true};},
  save:async input=>{f.calls.push(['save',input]);if(f.fail)throw f.fail;return{id:mix,current:true};}};
 class NativeMixRevisionError extends Error{constructor(reason){super(reason);this.reason=reason;}}
 const sdk={auth:{getUser:async()=>({data:{user:{id:actor}},error:null})},from:table=>{
  f.calls.push(['read',table]);const query={select(){return this;},eq(){return this;},maybeSingle:async()=>({data:f.existing,error:null})};return query;},
  functions:{invoke(){throw new Error('Mix must not invoke the audio-files processor');}}};
 new Function('require','exports',code.outputText)(id=>{
  if(id==='expo-crypto')return{randomUUID:()=>mix,CryptoDigestAlgorithm:{SHA256:'sha256'},digestStringAsync:async(_,value)=>createHash('sha256').update(value).digest('hex')};
  if(id==='expo-file-system/legacy')return{};
  if(id==='../../lib/supabase')return{supabase:sdk};
  if(id==='../../lib/creatorPlanAccess')return{requireCreatorMonthlyAllowance(){throw new Error('Mix creation must not consume the release allowance');}};
  if(id==='../../lib/storageUpload')return{uploadFileToSupabaseStorage(){throw new Error('Mix must not use legacy public-cover upload');}};
  if(id==='../playback/mixAccessSession')return{mixAccessSession:{current:()=>f.current,assertCurrent(){if(!f.current)throw new Error('changed');}}};
  if(id==='./nativeMixRevision')return{nativeMixRevision:revision,NativeMixRevisionError};
  if(id==='./nativeMixMediaPreparation')return{nativeMixMediaPreparation:{prepare:async input=>{f.calls.push(['media',input]);if(f.onMedia)f.onMedia(input);return`mix-media/${actor}/${mix}/${input.kind}/asset.${input.kind==='audio'?'mp3':'jpg'}`;}}};
  throw new Error(`Unexpected import ${id}`);
 },exports);
 f.draft={kind:'mix',plannedMixId:mix,title:'Night set',creator:'DJ fixture',genre:'House',rightsOwner:'DJ fixture',rightsConfirmed:true,
  artwork:{uri:'file:///art.jpg',name:'art.jpg'},audio:{uri:'file:///set.mp3',name:'set.mp3'},visibility:'private',moods:[],
  description:'Context',tracklist:'00:00 Artist — First\n01:02:03 Another Artist — Second',recordingType:'Studio mix',eventName:'',city:'',bpmMin:'120',bpmMax:'130',allowDownloads:false};
 f.run=options=>exports.createCreatorStudioDraft(f.draft,stage=>f.calls.push(['stage',stage]),{actorId:actor,scope,assertCurrent(){if(!f.current)throw new Error('changed');},...options});
 return f;
}
let count=0;async function test(name,run){await run();count++;console.log(`PASS ${name}`);}
await test('actual Mix creation prepares both protected files then atomically saves metadata and timestamped tracks',async()=>{
 const f=fixture();const result=await f.run();assert.equal(result.processingStatus,'ready');assert.equal(result.audioFileId,null);assert.equal(result.catalogId,mix);
 assert.deepEqual(f.calls.filter(c=>c[0]==='media').map(c=>[c[1].kind,c[1].mixId,c[1].visibility]),[['cover',mix,'private'],['audio',mix,'private']]);
 const saved=f.calls.find(c=>c[0]==='save')[1];assert.equal(saved.create,true);assert.equal(saved.details.status,'draft');assert.equal(saved.details.visibility,'private');
 assert.equal(saved.tracklist[0].raw_artist,'Artist');assert.equal(saved.tracklist[1].raw_title,'Second');assert.equal(saved.tracklist[1].start_seconds,3723);
 const g=fixture();await g.run();assert.deepEqual(g.calls.find(c=>c[0]==='save')[1].tracklist,saved.tracklist,'retry/restart keeps track IDs');
});
await test('malformed or reversed timestamps fail before any upload',async()=>{
 for(const text of ['not a timestamp','01:70 Artist — Track','01:00 First\n00:30 Second']){
  const f=fixture();f.draft.tracklist=text;await assert.rejects(f.run());assert.ok(!f.calls.some(c=>c[0]==='media'||c[0]==='save'));
 }
});
await test('unfinished save requires explicit recovery, which needs no local files or new uploads',async()=>{
 const f=fixture();f.pending=true;await assert.rejects(f.run(),error=>error.reason==='pending');assert.ok(!f.calls.some(c=>c[0]==='media'));
 f.draft.audio=null;f.draft.artwork=null;const recovered=await f.run({recoverMix:true});assert.equal(recovered.catalogId,mix);
 assert.equal(f.calls.filter(c=>c[0]==='resume').length,1);assert.ok(!f.calls.some(c=>c[0]==='save'||c[0]==='media'));
});
await test('saved planned ID is reopened after device-cleanup failure instead of uploading or creating again',async()=>{
 const f=fixture();f.existing={id:mix};const result=await f.run();assert.equal(result.current,false);assert.equal(result.catalogId,mix);
 assert.ok(!f.calls.some(c=>c[0]==='media'||c[0]==='save'));
});
await test('account change while preparing artwork prevents audio upload and save',async()=>{
 const f=fixture();f.onMedia=()=>{f.current=false;};await assert.rejects(f.run());assert.equal(f.calls.filter(c=>c[0]==='media').length,1);assert.ok(!f.calls.some(c=>c[0]==='save'));
});
await test('rejected/unknown save keeps original selected files and does not invoke destructive rollback',async()=>{
 const f=fixture();f.fail=new Error('connection lost');await assert.rejects(f.run(),/connection lost/);assert.ok(f.draft.audio&&f.draft.artwork);
 assert.deepEqual(f.calls.filter(c=>c[0]==='read').map(c=>c[1]),['mixes']);
});
const ownerCode=ts.transpileModule(readFileSync(new URL('../src/features/studio/ownerCatalogService.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function ownerFixture(){
 const copy='10000000-0000-4000-8000-000000000002';
 const f={calls:[],store:new Map(),pending:new Set(),current:true,fail:null,existing:null};const api={};
 class ErrorType extends Error{constructor(reason){super(reason);this.reason=reason;}}
 new Function('require','exports',ownerCode)(id=>{
  if(id==='expo-crypto')return{randomUUID:()=>copy};
  if(id==='expo-file-system/legacy')return{};
  if(id==='@react-native-async-storage/async-storage')return{default:{getItem:async key=>f.store.get(key)??null,setItem:async(key,value)=>f.store.set(key,value),removeItem:async key=>f.store.delete(key)}};
  if(id==='../../lib/creatorPlanAccess')return{requireCreatorMonthlyAllowance(){throw new Error('Mix copying must not consume the release allowance');}};
  if(id==='../../lib/supabase')return{supabase:{auth:{getUser:async()=>({data:{user:{id:actor}},error:null})},from:table=>{
    f.calls.push(['read',table]);return{select(){return this;},eq(){return this;},maybeSingle:async()=>({data:f.existing,error:null})};},functions:{invoke(){throw new Error('Mix must not use legacy processing');}}}};
  if(id==='../../lib/storageUpload')return{uploadFileToSupabaseStorage(){throw new Error('Mix must not upload to legacy public destinations');}};
  if(id==='../playback/mixAccessSession')return{mixAccessSession:{scope:()=>scope,assertCurrent(){if(!f.current)throw new ErrorType('changed');}}};
  if(id==='./nativeMixMediaPreparation')return{nativeMixMediaPreparation:{prepare:async input=>{f.calls.push(['media',input]);f.onMedia?.();return`mix-media/${actor}/${input.mixId}/${input.kind}/prepared.${input.kind==='cover'?'jpg':'mp3'}`;}}};
  if(id==='./nativeMixRevision')return{NativeMixRevisionError:ErrorType,nativeMixRevision:{hasPending:async context=>f.pending.has(context.mixId),
    save:async input=>{f.calls.push(['save',input]);if(f.fail){f.pending.add(input.mixId);throw f.fail;}return{id:input.mixId,current:true};},
    resume:async context=>{f.calls.push(['resume',context]);f.pending.delete(context.mixId);return{id:context.mixId,current:true};}}};
  throw new Error(`Unexpected owner import ${id}`);
 },api);
 f.api=api;f.copy=copy;f.record={id:mix,kind:'mix',title:'Owner set',description:'Context',status:'draft',isPublic:false,tracks:[],mixScope:scope,
  assertCurrent(){if(!f.current)throw new ErrorType('changed');},raw:{owner_user_id:actor,updated_at:'2026-11-02T12:00:00.123456+00:00',visibility:'private',
   audio_url:`mix-media/${actor}/${mix}/audio/original.mp3`,cover_url:`mix-media/${actor}/${mix}/cover/original.jpg`}};
 return f;
}
await test('owner metadata save prepares protected media and binds the exact server revision',async()=>{
 const f=ownerFixture();await f.api.saveOwnerCatalogRecord(f.record,{title:'Edited',description:'Context',visibility:'unlisted',tags:['House'],moods:[]});
 const saved=f.calls.find(c=>c[0]==='save')[1];assert.equal(saved.expectedUpdatedAt,f.record.raw.updated_at);assert.equal(saved.details.visibility,'unlisted');
 assert.deepEqual(f.calls.filter(c=>c[0]==='media').map(c=>c[1].visibility),['unlisted','unlisted']);
});
await test('owner publication preserves private visibility and archive/restore use protected files without date resets',async()=>{
 const f=ownerFixture();await f.api.submitOwnerCatalogForReview(f.record);
 let saved=f.calls.find(c=>c[0]==='save')[1];assert.equal(saved.details.status,'published');assert.equal(saved.details.visibility,undefined);assert.equal(saved.details.published_at,undefined);
 for(const [method,status] of [['removeOwnerCatalogFromPublic','archived'],['restoreOwnerCatalogDraft','draft']]){
  f.calls.length=0;await f.api[method](f.record);saved=f.calls.find(c=>c[0]==='save')[1];assert.equal(saved.details.status,status);assert.equal(saved.details.visibility,'private');
 }
});
await test('owner audio/artwork replacement uses protected preparation and leaves audio as a private draft',async()=>{
 const f=ownerFixture();const asset={uri:'file:///replacement.mp3',name:'replacement.mp3'};
 await f.api.replaceOwnerCatalogAudio(f.record,asset);let saved=f.calls.find(c=>c[0]==='save')[1];assert.equal(saved.details.status,'draft');assert.equal(saved.details.visibility,'private');assert.equal(saved.details.duration_seconds,null);
 assert.equal(f.calls.find(c=>c[0]==='media'&&c[1].kind==='audio')[1].file,asset);
 f.calls.length=0;await f.api.replaceOwnerCatalogArtwork(f.record,{...asset,name:'cover.jpg'});
 assert.ok(f.calls.find(c=>c[0]==='media'&&c[1].kind==='cover')[1].file);
});
await test('owner private copy persists its target before copying, binds source revision and resumes without another copy',async()=>{
 const f=ownerFixture();f.fail=new Error('unknown save');await assert.rejects(f.api.duplicateOwnerCatalogRecord(f.record),/unknown save/);
 assert.ok(f.store.size);const saved=f.calls.find(c=>c[0]==='save')[1];assert.equal(saved.mixId,f.copy);assert.equal(saved.sourceMixId,mix);assert.equal(saved.sourceUpdatedAt,f.record.raw.updated_at);
 assert.ok(f.calls.filter(c=>c[0]==='media').every(c=>c[1].mixId===f.copy&&c[1].sourceMixId===mix));
 const copied=f.calls.filter(c=>c[0]==='media').length;await assert.rejects(f.api.duplicateOwnerCatalogRecord(f.record),e=>e.reason==='pending');
 const recovered=await f.api.recoverOwnerMixSave(f.record);assert.equal(recovered.id,f.copy);assert.equal(recovered.copy,true);assert.equal(f.store.size,0);
 assert.equal(f.calls.filter(c=>c[0]==='media').length,copied);
});
await test('owner mutation rejects account changes before writing and retains originals on unknown outcome',async()=>{
 const f=ownerFixture();f.onMedia=()=>{f.current=false;};await assert.rejects(f.api.restoreOwnerCatalogDraft(f.record));assert.ok(!f.calls.some(c=>c[0]==='save'));
 const g=ownerFixture();g.fail=new Error('save unknown');const original=g.record.raw.audio_url;
 await assert.rejects(g.api.replaceOwnerCatalogAudio(g.record,{uri:'file:///replacement.mp3',name:'replacement.mp3'}),/save unknown/);assert.equal(g.record.raw.audio_url,original);
});
console.log(`PASS ${count} actual-source Mix creation/owner scenarios; native media/revision boundaries mocked, no hosted calls or device claim.`);
