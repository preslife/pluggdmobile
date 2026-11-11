import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const loaded = new Map();
function load(name){if(loaded.has(name))return loaded.get(name);const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+'src/features/academy/'+name+'.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{module,exports:module.exports,URL,Date,AbortController,require:id=>load(id.slice(2))});loaded.set(name,module.exports);return module.exports;}
const {createAcademyActorScope}=load('academySession'),{createAcademyApi}=load('academyApi');
const actor='00000000-0000-4000-8000-000000000001',course='00000000-0000-4000-8000-000000000002',lesson='00000000-0000-4000-8000-000000000003';
const metadata={id:course,slug:'free-skills',title:'Free skills',visibility:'public',published_at:'2026-11-01',price_cents:0,pricing:null};
const lessonRow={id:lesson,title:'Lesson',content:'Real lesson'};
const detail={course:{system:'lms',id:course,identifier:'free-skills',title:'Free skills',description:'',difficulty:'',lessonCount:1,minutes:0},lessons:[{id:lesson,title:'Lesson',summary:'',body:'Real lesson',format:'markdown',resources:[]}]};
function environment(initial){
 let session={user:{id:actor},access_token:'fixture-token-a'},listener=null,row=initial&&{...initial};const calls=[];const hooks={};
 const progress=()=>row&&({...row,completed_lesson_ids:[...row.completed_lesson_ids]});
 // Builders are thenable like installed PostgREST; actions run only once awaited.
 function bound(kind,payload,operation){let header,signal;const builder={setHeader(name,value){assert.equal(name,'Authorization');header=value;return builder;},abortSignal(value){signal=value;return builder;},then(resolve,reject){return Promise.resolve().then(async()=>{calls.push({kind,payload,header});await hooks.before?.(kind);if(signal?.aborted)throw Error('aborted');const result=operation();await hooks.after?.(kind);return{data:result,error:null};}).then(resolve,reject);}};return builder;}
 const transport={session:async()=>({data:{session},error:null}),subscribe:fn=>{listener=fn;return()=>{listener=null;}},rpc:(name,args)=>bound(name,args,()=>{
  if(name==='get_lms_course_detail')return{course:metadata,access:{granted:true,requires_purchase:false,requires_membership:false,required_tier:'free'},lessons:args.p_include_lessons?[lessonRow]:[]};
  if(name==='get_lms_course_progress')return progress();
  if(name==='record_lms_lesson_progress'){if(!row)row=empty();row.completed_lesson_ids=args.p_completed?[lesson]:[];row.percent_complete=args.p_completed?100:0;return progress();}throw Error(name);
 }),updateResume:(userId,courseId,lessonId,visitedAt)=>bound('update-resume',{userId,courseId,changes:{last_lesson_id:lessonId,last_accessed:visitedAt}},()=>{if(!row)return null;row.last_lesson_id=lessonId;row.last_accessed=visitedAt;return progress();}),insertResume:(userId,courseId,lessonId,visitedAt)=>bound('insert-ignore-duplicate',{userId,courseId,changes:{last_lesson_id:lessonId,last_accessed:visitedAt}},()=>{if(!row)row={...empty(),last_lesson_id:lessonId,last_accessed:visitedAt};return null;})};
 return {api:createAcademyApi(transport.rpc,createAcademyActorScope(transport)),calls,hooks,getRow:progress,setRow:value=>{row=value;},switchActor:()=>{session={user:{id:'other-account'},access_token:'fixture-token-b'};listener?.('SIGNED_IN');},getListener:()=>listener};
}
function empty(){return{user_id:actor,course_id:course,completed_lesson_ids:[],last_lesson_id:null,percent_complete:0,total_time_minutes:0};}
(async()=>{
 for(const websiteComplete of [true,false]){
  const env=environment({...empty(),total_time_minutes:7,completed_lesson_ids:websiteComplete?[]:[lesson],percent_complete:websiteComplete?0:100});
  env.hooks.before=kind=>{if(kind==='update-resume')env.setRow({...empty(),total_time_minutes:7,completed_lesson_ids:websiteComplete?[lesson]:[],percent_complete:websiteComplete?100:0});};
  const result=await env.api.save(actor,detail,lesson,null);
  assert.deepEqual([...result.completed],websiteComplete?[lesson]:[]);assert.equal(result.percent,websiteComplete?100:0);assert.equal(env.getRow().total_time_minutes,7);
  assert.ok(!env.calls.some(call=>call.kind==='record_lms_lesson_progress'));
  for(const call of env.calls)assert.equal(call.header,'Bearer fixture-token-a');
 }
 for(const race of [false,true]){
  const env=environment(null);
  if(race)env.hooks.before=kind=>{if(kind==='insert-ignore-duplicate')env.setRow({...empty(),completed_lesson_ids:[lesson],percent_complete:100});};
  const result=await env.api.save(actor,detail,lesson,null);
  assert.equal(result.percent,race?100:0);assert.deepEqual([...result.completed],race?[lesson]:[]);
  assert.equal(env.calls.filter(call=>call.kind==='insert-ignore-duplicate').length,1);assert.equal(env.calls.filter(call=>call.kind==='update-resume').length,2);
 }
 for(const transition of ['metadata','before-resume','during-progress']){
  const env=environment(empty());let fired=false;
  env.hooks.before=kind=>{if(!fired&&((transition==='metadata'&&kind==='get_lms_course_detail')||(transition==='before-resume'&&kind==='update-resume')||(transition==='during-progress'&&kind==='get_lms_course_progress'))){fired=true;env.switchActor();}};
  await assert.rejects(()=>transition==='during-progress'?env.api.progress(actor,detail):env.api.save(actor,detail,lesson,transition==='before-resume'?null:true),/session_changed|aborted/);
  assert.equal(env.getRow().percent_complete,0);assert.ok(!env.calls.some(call=>call.kind==='record_lms_lesson_progress'));assert.equal(env.getListener(),null);
 }
 const admission=environment(empty());
 admission.hooks.after=kind=>{ if(kind==='get_lms_course_detail' && admission.calls.filter(call=>call.kind===kind).length===2) admission.switchActor(); };
 await assert.rejects(()=>admission.api.save(actor,detail,lesson,true),/session_changed/);
 assert.ok(!admission.calls.some(call=>call.kind==='record_lms_lesson_progress'),'account changed after final admission: no completion write');
 const env=environment(empty());env.switchActor();await assert.rejects(()=>env.api.save(actor,detail,lesson,true),/session_changed/);assert.equal(env.calls.length,0);
 const complete=environment(empty());assert.equal((await complete.api.save(actor,detail,lesson,true)).percent,100);assert.equal((await complete.api.save(actor,detail,lesson,false)).percent,0);
 // Exercise the actual Reader save callback against TanStack Query's real cancellation.
 const { QueryClient } = require('@tanstack/query-core');
 const screenSource = ts.createSourceFile('AcademyScreens.tsx', fs.readFileSync(root+'src/features/academy/AcademyScreens.tsx','utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
 let saveSource;
 const findSave = node => { if (ts.isVariableDeclaration(node) && node.name.getText(screenSource)==='save') saveSource=node.initializer.getText(screenSource); ts.forEachChild(node,findSave); };
 findSave(screenSource);assert.ok(saveSource);
 const client = new QueryClient({defaultOptions:{queries:{retry:false,gcTime:Infinity}}});
 const progressKey=['academy',actor,'progress','lms',course];
 const oldProgress={completed:[],lastLessonId:lesson,percent:0};
 const newProgress={completed:[lesson],lastLessonId:lesson,percent:100};
 client.setQueryData(progressKey,oldProgress);
 let releaseSync;
 const sync=client.fetchQuery({queryKey:progressKey,queryFn:()=>new Promise(resolve=>{releaseSync=resolve;})}).catch(()=>undefined);
 await Promise.resolve();
 let writeCount=0;
 const active={current:true};
 const context={actor,busy:{current:false},progress:{isSuccess:true},setSaving:()=>{},setSaved:()=>{},setFailed:()=>{},setBlocked:()=>{},client,progressKey,active,detail,
   AcademyUnavailableError:load('academyApi').AcademyUnavailableError,academyApi:{save:async()=>{writeCount++;return newProgress;}}};
 const readerSave=vm.runInNewContext(ts.transpileModule(`const target=${saveSource};target;`,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 await readerSave(lesson,true);assert.equal(writeCount,1);releaseSync(oldProgress);await sync;await Promise.resolve();
 assert.deepEqual(client.getQueryData(progressKey),newProgress,'late website sync cannot overwrite a completed save');
 const stopped=readerSave(lesson,false);active.current=false;await stopped;assert.equal(writeCount,1,'unmounted/account-switched Reader does not start another write after cancellation');
 client.clear();
 console.log('PASS Academy actor/resume concurrency: website complete and Undo survive visits; first row uses defaults; concurrent first-row website progress preserved; requests retain initiating bearer; auth changes abort reads/writes before mutation; explicit complete/Undo RPC preserved; actual Reader cancels stale sync and stops unmounted writes. No network or production writes.');
})().catch(error=>{console.error(error);process.exitCode=1;});
