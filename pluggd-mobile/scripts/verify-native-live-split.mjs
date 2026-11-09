import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=new URL('../', import.meta.url).pathname;
function load(path, dependencies={}) {const module={exports:{}};vm.runInNewContext(ts.transpileModule(fs.readFileSync(root+path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module,exports:module.exports,require:(name)=>dependencies[name],console,Error,Set,URL});return module.exports;}
const {createLiveStartGate}=load('src/features/live/liveStartGate.ts');
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
for(const events of [['joined','audio','video'],['video','audio','joined'],['audio','joined','video']]) {
 let confirmations=0,ready=0;
 const gate=createLiveStartGate({needsVideo:true,confirm:async()=>{confirmations++},onReady:()=>ready++,onError:()=>assert.fail('unexpected error')});
 for(let i=0;i<events.length;i++){const e=events[i];e==='joined'?gate.joined():e==='audio'?gate.audioPublished(true):gate.videoPublished(true);if(i<2)assert.equal(confirmations,0);}
 await tick();assert.equal(confirmations,1);assert.equal(ready,1);gate.audioPublished(true);await tick();assert.equal(confirmations,1);
 gate.disconnected();gate.joined();await tick();assert.equal(confirmations,1);assert.ok(ready>=2);
}
let done;let ready=0;
const gate=createLiveStartGate({needsVideo:false,confirm:()=>new Promise(r=>done=r),onReady:()=>ready++,onError:()=>assert.fail()});gate.joined();gate.audioPublished(true);gate.dispose();done();await tick();assert.equal(ready,0);
let failures=0;const failed=createLiveStartGate({needsVideo:false,confirm:async()=>{throw Error('private')},onReady:()=>assert.fail(),onError:()=>failures++});failed.joined();failed.audioPublished(true);await tick();assert.equal(failures,1);
const audio=createLiveStartGate({needsVideo:false,confirm:async()=>{},onReady:()=>ready++,onError:()=>assert.fail()});audio.joined();audio.audioPublished(true);await tick();assert.equal(ready,1);
let response={data:{status:'active'},error:null};let last;
const supabase={rpc:async(name,args)=>{last={name,args};return response},functions:{invoke:async(name,args)=>{last={name,args};return response}}};
const split=load('src/features/studio/splitJoinService.ts',{'../../lib/supabase':{supabase}});
await split.loadSplitJoinPreview('token');assert.equal(last.name,'get_split_join_session_public');assert.equal(last.args.p_join_token,'token');
response={data:{status:'joined',agreementId:'agreement'},error:null};await split.joinSplitWithConnectCard('token','hostile');assert.equal(last.name,'join_split_session_from_connect_card');assert.equal(last.args.p_source,'link');assert.equal(Object.keys(last.args).length,2);
response={data:null,error:{message:'split_details_required private-provider-detail'}};await assert.rejects(()=>split.joinSplitWithConnectCard('token','qr'),/Complete your legal name/);
response={data:{},error:null};await assert.rejects(()=>split.joinSplitWithConnectCard('token','qr'),/could not be confirmed/);
const live=load('src/lib/live.ts',{'./supabase':{supabase}});
response={data:{role:'host'},error:null};await live.fetchLiveToken({roomId:'room',role:'host'});assert.equal(last.args.body.defer_live_status,true);
await live.fetchLiveToken({roomId:'room',role:'audience'});assert.equal(last.args.body.defer_live_status,undefined);
response={data:{success:true},error:null};await live.confirmLiveStarted('room',{uid:99,channelName:'channel'});assert.deepEqual(JSON.parse(JSON.stringify(last.args.body)),{action:'confirm_live_started',payload:{room_id:'room',host_uid:99,channel_name:'channel'}});
response={data:{error:'private'},error:null};await assert.rejects(()=>live.confirmLiveStarted('room',{uid:99,channelName:'channel'}),/could not be confirmed/);
const policy=load('src/lib/notificationUrlPolicy.ts');const hosts=new Set(['pluggd.fm']);
for(const path of ['/split/approve/approval','pluggd://split/join/token','https://pluggd.fm/split/join/token'])assert.equal(policy.matchesAllowedNotificationUrl(path,hosts),true);
assert.equal(policy.matchesAllowedNotificationUrl('https://evil.example/split/join/token',hosts),false);
assert.equal(policy.matchesAllowedNotificationUrl('/split/../admin',hosts),false);
console.log('PASS Live publication ordering, audio-only, idempotence, reconnect, disposed confirmation, error; existing Live and split RPC payloads, safe errors, notification routes.');

const privacy=load('src/lib/observabilityPolicy.ts');
for(const url of ['https://pluggd.fm/split/join/private-token?source=link','/split/join/private-token','pluggd://split/join/private-token']) {
 const redacted=privacy.sanitizeObservabilityUrl(url);assert.ok(!redacted.includes('private-token'));assert.ok(redacted.includes('[redacted]'));
}
assert.equal(privacy.sanitizeObservabilityUrl('https://pluggd.fm/split/approve/approval?source=push'),'https://pluggd.fm/split/approve/approval');
const mobile=fs.readFileSync(root+'src/features/culture/mobileServices.ts','utf8');
const mapping=mobile.slice(mobile.indexOf('function routeForNotificationData('),mobile.indexOf('export async function loadMobileNotifications'));
const context={};vm.runInNewContext(ts.transpileModule(mapping, {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText+'; this.route=routeForNotificationData;',context);
assert.equal(context.route({type:'split_approval',payload:{approval_id:'approval'}}),'/split/approve/approval');
assert.equal(context.route({related_type:'split_approval',related_id:'approval'}),'/split/approve/approval');
assert.equal(context.route({type:'split_approval',payload:{approval_id:'../unsafe'}}),'/split/approve/..%2Funsafe');
console.log('PASS split capability URL privacy and inbox mapping.');
